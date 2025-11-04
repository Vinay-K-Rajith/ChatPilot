import * as dotenv from 'dotenv';

dotenv.config();

export class TwilioContentService {
  private static instance: TwilioContentService;
  private accountSid: string;
  private authToken: string;

  private constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
  }

  public static getInstance(): TwilioContentService {
    if (!TwilioContentService.instance) {
      TwilioContentService.instance = new TwilioContentService();
    }
    return TwilioContentService.instance;
  }

  private get headersJson() {
    const creds = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    return {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/json',
    } as Record<string, string>;
  }

  public async createContent(body: {
    language: string;
    friendly_name?: string;
    types: Record<string, any>;
    variables?: Record<string, string>;
  }): Promise<{ success: boolean; contentSid?: string; raw?: any; error?: string }>
  {
    if (!this.accountSid || !this.authToken) return { success: false, error: 'Twilio credentials missing' };

    try {
      const resp = await fetch('https://content.twilio.com/v1/Content', {
        method: 'POST',
        headers: this.headersJson,
        body: JSON.stringify(body),
      } as any);
      const text = await resp.text();
      let json: any; try { json = JSON.parse(text); } catch { json = undefined; }
      if (!resp.ok) {
        const msg = json?.message || text || `HTTP ${resp.status}`;
        return { success: false, error: msg, raw: json || text };
      }
      return { success: true, contentSid: json?.sid || json?.content_sid || json?.id, raw: json };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error creating content' };
    }
  }

  public async submitForApproval(contentSid: string, body: { name: string; category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION' }): Promise<{ success: boolean; approvalSid?: string; status?: string; raw?: any; error?: string }>
  {
    try {
      const url = `https://content.twilio.com/v1/Content/${encodeURIComponent(contentSid)}/ApprovalRequests/whatsapp`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: this.headersJson,
        body: JSON.stringify(body),
      } as any);
      const text = await resp.text();
      let json: any; try { json = JSON.parse(text); } catch { json = undefined; }
      if (!resp.ok) {
        const msg = json?.message || text || `HTTP ${resp.status}`;
        return { success: false, error: msg, raw: json || text };
      }
      return { success: true, approvalSid: json?.sid, status: json?.status || json?.review_status || 'submitted', raw: json };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error submitting approval' };
    }
  }

  public async getStatus(contentSid: string): Promise<{ success: boolean; status?: string; raw?: any; error?: string }>
  {
    // Strategy:
    // 1) Query ApprovalRequests subresource for WhatsApp (most reliable)
    // 2) Fallback to Content resource fields
    // 3) Normalize status to approved/pending/rejected/disabled where possible
    const normalize = (s?: string): string | undefined => {
      if (!s) return undefined;
      const v = s.toString().toLowerCase();
      if (/(approved|approve|live|active)/.test(v)) return 'approved';
      if (/(pending|in_review|submitted|review)/.test(v)) return 'pending';
      if (/(rejected|reject|failed|denied)/.test(v)) return 'rejected';
      if (/(paused|disabled|inactive)/.test(v)) return 'disabled';
      return s;
    };

    try {
      // 1) ApprovalRequests subresource - Try /ApprovalRequests (list endpoint)
      const apprUrl = `https://content.twilio.com/v1/Content/${encodeURIComponent(contentSid)}/ApprovalRequests`;
      const apprResp = await fetch(apprUrl, { headers: this.headersJson } as any);
      const apprText = await apprResp.text();
      
      let apprJson: any; try { apprJson = JSON.parse(apprText); } catch { apprJson = undefined; }
      
      if (apprResp.ok && apprJson) {
        // Handle different response formats from ApprovalRequests endpoint
        let finalStatus: string | undefined = undefined;
        
        // Format 1: { "whatsapp": { "status": "approved" } } - Single approval request
        if (apprJson?.whatsapp?.status) {
          const rawStatus = apprJson.whatsapp.status;
          finalStatus = normalize(rawStatus);
          return { success: true, status: finalStatus, raw: apprJson };
        }
        
        // Format 2: { "approval_requests": [...] } - List of approval requests
        const listCandidates: any[] = [];
        if (Array.isArray(apprJson?.approval_requests)) {
          listCandidates.push(...apprJson.approval_requests);
        } else if (Array.isArray(apprJson)) {
          listCandidates.push(...apprJson);
        } else if (apprJson?.status || apprJson?.whatsapp_status) {
          listCandidates.push(apprJson);
        }
        
        if (listCandidates.length) {
          const mapped = listCandidates.map((it: any) => {
            // Try multiple possible field names
            const rawStatus = it?.status || it?.whatsapp_status || it?.review_status || it?.whatsapp?.status;
            const normalized = normalize(rawStatus);
            return {
              status: normalized,
              updated: new Date(it?.date_updated || it?.date_created || 0).getTime(),
            };
          });
          
          // Sort by most recent
          mapped.sort((a, b) => (b.updated || 0) - (a.updated || 0));
          finalStatus = mapped.find(m => m.status)?.status;
          
          if (finalStatus) {
            return { success: true, status: finalStatus, raw: apprJson };
          }
        }
      }
    } catch (e: any) {
      // Ignore and fallback to Content resource
    }

    try {
      // 2) Fallback to Content resource
      const url = `https://content.twilio.com/v1/Content/${encodeURIComponent(contentSid)}`;
      const resp = await fetch(url, { headers: this.headersJson } as any);
      const text = await resp.text();
      
      let json: any; try { json = JSON.parse(text); } catch { json = undefined; }
      
      if (!resp.ok) {
        const msg = json?.message || text || `HTTP ${resp.status}`;
        return { success: false, error: msg, raw: json || text };
      }
      
      const status = normalize(json?.whatsapp_approval_status || json?.status);
      return { success: true, status: status || 'unknown', raw: json };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error fetching status' };
    }
  }

  /** Fetches the Content object from Twilio Content API */
  public async getContent(contentSid: string): Promise<{ success: boolean; content?: any; error?: string }>
  {
    try {
      const url = `https://content.twilio.com/v1/Content/${encodeURIComponent(contentSid)}`;
      const resp = await fetch(url, { headers: this.headersJson } as any);
      const text = await resp.text();
      let json: any; try { json = JSON.parse(text); } catch { json = undefined; }
      if (!resp.ok) {
        const msg = json?.message || text || `HTTP ${resp.status}`;
        return { success: false, error: msg };
      }
      return { success: true, content: json };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error fetching content' };
    }
  }
}
