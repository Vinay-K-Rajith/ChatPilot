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
    try {
      const url = `https://content.twilio.com/v1/Content/${encodeURIComponent(contentSid)}`;
      const resp = await fetch(url, { headers: this.headersJson } as any);
      const text = await resp.text();
      let json: any; try { json = JSON.parse(text); } catch { json = undefined; }
      if (!resp.ok) {
        const msg = json?.message || text || `HTTP ${resp.status}`;
        return { success: false, error: msg, raw: json || text };
      }
      // content has approvals list in sub-resource; basic status from latest approval if available
      const approvalStatus = (json?.whatsapp_approval_status || json?.status) as string | undefined;
      return { success: true, status: approvalStatus || 'unknown', raw: json };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error fetching status' };
    }
  }
}
