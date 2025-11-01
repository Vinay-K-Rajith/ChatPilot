import * as dotenv from 'dotenv';

dotenv.config();

interface UsageTotals {
  requests: number;
  tokens: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

interface DailyUsage extends UsageTotals {
  date: string;
}

export class OpenAIUsageService {
  private static instance: OpenAIUsageService;
  private cache = new Map<string, { ts: number; data: any }>();
  private CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  static getInstance() {
    if (!this.instance) this.instance = new OpenAIUsageService();
    return this.instance;
  }

  private get apiKey() {
    return process.env.OPENAI_API_KEY || '';
  }

  private get projectHeader(): Record<string, string> {
    const project = process.env.OPENAI_PROJECT || process.env.OPENAI_PROJECT_ID || '';
    return project ? { 'OpenAI-Project': project } : {};
  }

  private get orgHeader(): Record<string, string> {
    const org = process.env.OPENAI_ORG || process.env.OPENAI_ORGANIZATION || '';
    return org ? { 'OpenAI-Organization': org } : {};
  }

  private lastMonthRange() {
    const now = new Date();
    const firstOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const lastDayPrevMonth = new Date(firstOfThisMonth.getTime() - 24 * 60 * 60 * 1000);
    const firstDayPrevMonth = new Date(Date.UTC(lastDayPrevMonth.getUTCFullYear(), lastDayPrevMonth.getUTCMonth(), 1));

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return { start_date: fmt(firstDayPrevMonth), end_date: fmt(lastDayPrevMonth) };
  }

  async getUsage(params?: { start_date?: string; end_date?: string }) {
    if (!this.apiKey) {
      return { success: false, error: 'OPENAI_API_KEY not configured' };
    }

    const range = params?.start_date && params?.end_date
      ? { start_date: params.start_date, end_date: params.end_date }
      : this.lastMonthRange();

    const { start_date, end_date } = range;

    const cacheKey = `${start_date}:${end_date}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.ts < this.CACHE_TTL_MS) {
      return cached.data;
    }

    // The /v1/usage endpoint expects a single 'date' param.
    // Aggregate by fetching each day in the range and combining the results.
    const dates = this.enumerateDates(start_date, end_date);

    const dayResults: any[] = [];
    for (const chunk of this.chunk(dates, 5)) { // simple throttle
      const results = await Promise.all(
        chunk.map(async (date) => {
          const u = new URL('https://api.openai.com/v1/usage');
          u.searchParams.set('date', date);
          try {
            const r = await fetch(u.toString(), {
              headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                // Some accounts require this beta header; harmless if not needed
'OpenAI-Beta': 'usage=v1',
                ...this.projectHeader,
                ...this.orgHeader,
              },
            } as any);
            if (!r.ok) {
              const txt = await r.text();
              return { date, error: `HTTP ${r.status}: ${txt.slice(0, 200)}` };
            }
            const j = await r.json();
            return { date, data: j };
          } catch (e: any) {
            return { date, error: e?.message || String(e) };
          }
        })
      );
      dayResults.push(...results);
    }

    // Combine successful days
    const combinedRaw = { data: [] as any[] };
    for (const r of dayResults) {
      if (r?.data) {
        // Attach date to each record if missing
        const arr = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data?.results) ? r.data.results : [];
        for (const item of arr) {
          if (!item.date && !item.timestamp && !item.aggregation_timestamp) {
            item.date = r.date;
          }
          combinedRaw.data.push(item);
        }
      }
    }

    let { totals, daily } = this.computeTotalsAndDaily(combinedRaw);

    // Fallback to organization usage endpoints if everything is zero
    if (totals.requests === 0 && totals.tokens === 0 && totals.input_tokens === 0 && totals.output_tokens === 0) {
      try {
        const org = await this.fetchOrgUsage(range.start_date, range.end_date);
        if (org) {
          // Replace with org data if present
          totals = org.totals;
          daily = org.daily;
        }
      } catch (e) {
        // ignore fallback error; keep zeros
      }
    }

    const data = {
      success: true,
      range: { start_date, end_date },
      totals,
      daily,
      raw: { days: dayResults },
    };

    this.cache.set(cacheKey, { ts: now, data });
    return data;
  }

  private enumerateDates(start: string, end: string): string[] {
    const out: string[] = [];
    const cur = new Date(start + 'T00:00:00Z');
    const endD = new Date(end + 'T00:00:00Z');
    while (cur <= endD) {
      out.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return out;
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  private computeTotalsAndDaily(raw: any): { totals: UsageTotals; daily: DailyUsage[] } {
    const totals: UsageTotals = {
      requests: 0,
      tokens: 0,
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: 0,
    };

    const dailyMap = new Map<string, UsageTotals>();

    const push = (date: string, part: Partial<UsageTotals>) => {
      if (!dailyMap.has(date)) dailyMap.set(date, { requests: 0, tokens: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 });
      const d = dailyMap.get(date)!;
      d.requests += part.requests ?? 0;
      d.tokens += part.tokens ?? 0;
      d.input_tokens += part.input_tokens ?? 0;
      d.output_tokens += part.output_tokens ?? 0;
      d.cost_usd += part.cost_usd ?? 0;
    };

    // The raw shape may vary; handle common shapes defensively
    const dataArray: any[] = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.results) ? raw.results : [];

    for (const item of dataArray) {
      // Derive date string
      let dateStr = '';
      if (typeof item?.aggregation_timestamp === 'number') {
        const d = new Date((item.aggregation_timestamp * 1000));
        dateStr = d.toISOString().slice(0, 10);
      } else if (typeof item?.timestamp === 'number') {
        const d = new Date((item.timestamp * 1000));
        dateStr = d.toISOString().slice(0, 10);
      } else if (item?.date) {
        dateStr = String(item.date).slice(0, 10);
      } else if (item?.time) {
        const d = new Date(String(item.time));
        dateStr = isNaN(d.getTime()) ? String(item.time).slice(0, 10) : d.toISOString().slice(0, 10);
      }

      const nRequests = Number(item?.n_requests ?? item?.request_count ?? item?.num_requests ?? 0) || 0;

      const inputAlt = Number(item?.input_tokens ?? item?.usage?.input_tokens ?? item?.n_context_tokens_total ?? 0) || 0;
      const outputAlt = Number(item?.output_tokens ?? item?.usage?.output_tokens ?? item?.n_generated_tokens_total ?? 0) || 0;
      const totalTokens = Number(
        item?.total_tokens ?? item?.usage?.total_tokens ?? (inputAlt + outputAlt) ?? item?.tokens
      ) || (inputAlt + outputAlt) || 0;
      const inputTokens = inputAlt;
      const outputTokens = outputAlt;

      // Cost extraction (various shapes)
      let costUsd = 0;
      if (typeof item?.cost_usd === 'number') costUsd = item.cost_usd;
      else if (typeof item?.cost_cents === 'number') costUsd = item.cost_cents / 100;
      else if (typeof item?.cost_cents_usd === 'number') costUsd = item.cost_cents_usd / 100;
      else if (item?.cost && typeof item.cost === 'number') costUsd = item.cost; // assume already USD
      else if (item?.cost?.usd && typeof item.cost.usd === 'number') costUsd = item.cost.usd;
      else if (item?.cost?.total?.usd && typeof item.cost.total.usd === 'number') costUsd = item.cost.total.usd;
      else if (item?.usage?.cost_usd && typeof item.usage.cost_usd === 'number') costUsd = item.usage.cost_usd;

      totals.requests += nRequests;
      totals.tokens += totalTokens;
      totals.input_tokens += inputTokens;
      totals.output_tokens += outputTokens;
      totals.cost_usd += costUsd;

      const part: Partial<UsageTotals> = {
        requests: nRequests,
        tokens: totalTokens,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
      };
      push(dateStr || 'unknown', part);
    }

    const daily: DailyUsage[] = Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { totals, daily };
  }

  private get adminKey() {
    return process.env.OPENAI_ADMIN_KEY || this.apiKey;
  }

  private async fetchOrgUsage(start_date: string, end_date: string): Promise<{ totals: UsageTotals; daily: DailyUsage[] } | null> {
    const startSec = Math.floor(new Date(start_date + 'T00:00:00Z').getTime() / 1000);
    // end_time is exclusive; add one day to include end_date fully
    const endSec = Math.floor(new Date(end_date + 'T00:00:00Z').getTime() / 1000) + 24 * 60 * 60;

    const base = 'https://api.openai.com/v1/organization/usage';

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.adminKey}`,
      'Content-Type': 'application/json',
      ...this.orgHeader,
    };

    const qs = new URLSearchParams({ start_time: String(startSec), end_time: String(endSec), bucket_width: '1d', limit: '31' });

    const fetchJson = async (path: string) => {
      try {
        const r = await fetch(`${base}/${path}?${qs.toString()}`, { headers } as any);
        if (!r.ok) return null;
        return await r.json();
      } catch {
        return null;
      }
    };

    const [completions, embeddings, moderations] = await Promise.all([
      fetchJson('completions'),
      fetchJson('embeddings'),
      fetchJson('moderations'),
    ]);

    if (!completions && !embeddings && !moderations) return null;

    const totals: UsageTotals = { requests: 0, tokens: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 };
    const dailyMap = new Map<string, UsageTotals>();

    const add = (date: string, part: Partial<UsageTotals>) => {
      if (!dailyMap.has(date)) dailyMap.set(date, { requests: 0, tokens: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 });
      const d = dailyMap.get(date)!;
      d.requests += part.requests ?? 0;
      d.tokens += part.tokens ?? 0;
      d.input_tokens += part.input_tokens ?? 0;
      d.output_tokens += part.output_tokens ?? 0;
      d.cost_usd += part.cost_usd ?? 0;
    };

    const buckets = (page: any) => (Array.isArray(page?.data) ? page.data : []).filter((b: any) => b && typeof b === 'object');

    const handleBucket = (b: any) => {
      const start = typeof b?.start_time === 'number' ? new Date(b.start_time * 1000).toISOString().slice(0, 10) : undefined;
      const results = Array.isArray(b?.results) ? b.results : [];
      let reqs = 0, inTok = 0, outTok = 0;
      for (const r of results) {
        reqs += Number(r?.num_model_requests || 0);
        inTok += Number(r?.input_tokens || 0);
        outTok += Number(r?.output_tokens || 0);
      }
      if (start) {
        totals.requests += reqs;
        totals.input_tokens += inTok;
        totals.output_tokens += outTok;
        totals.tokens += inTok + outTok;
        add(start, { requests: reqs, input_tokens: inTok, output_tokens: outTok, tokens: inTok + outTok });
      }
    };

    for (const b of buckets(completions)) handleBucket(b);
    for (const b of buckets(embeddings)) handleBucket(b);
    for (const b of buckets(moderations)) handleBucket(b);

    const daily = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));

    return { totals, daily };
  }
}

export default OpenAIUsageService.getInstance();
