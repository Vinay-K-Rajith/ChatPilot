import * as dotenv from 'dotenv';

dotenv.config();

export type TemplateCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
export type Component = { type: 'TEXT' | 'MEDIA' | 'BODY' | 'FOOTER'; text?: string };

export interface TemplateSubmission {
  name: string;
  language: string; // e.g., en, en_US, hi
  category: TemplateCategory;
  components: {
    header?: Component;
    body: Component; // BODY required
    footer?: Component;
  };
}

export class TwilioTemplatesService {
  private static instance: TwilioTemplatesService;
  private accountSid: string;
  private authToken: string;

  private constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
  }

  public static getInstance(): TwilioTemplatesService {
    if (!TwilioTemplatesService.instance) {
      TwilioTemplatesService.instance = new TwilioTemplatesService();
    }
    return TwilioTemplatesService.instance;
  }

  private get authHeader() {
    const creds = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    return `Basic ${creds}`;
  }

  private buildComponentsArray(components: TemplateSubmission['components']) {
    const arr: any[] = [];
    if (components.header) {
      const h = components.header.type === 'TEXT' ? { Type: 'HEADER', Text: components.header.text } : { Type: 'HEADER', Format: 'MEDIA' };
      arr.push(h);
    }
    if (components.body) {
      arr.push({ Type: 'BODY', Text: components.body.text });
    }
    if (components.footer && components.footer.text) {
      arr.push({ Type: 'FOOTER', Text: components.footer.text });
    }
    return arr;
  }

  /**
   * Submit a WhatsApp template for approval via Twilio. Tries the known endpoints for best compatibility.
   */
  public async submitTemplate(payload: TemplateSubmission): Promise<{ success: boolean; status?: string; templateId?: string; provider?: string; error?: string; raw?: any; }> {
    if (!this.accountSid || !this.authToken) {
      return { success: false, error: 'Twilio credentials are not configured' };
    }

    // Prepare common body
    const components = this.buildComponentsArray(payload.components);
    const form = new URLSearchParams();
    form.set('FriendlyName', payload.name);
    form.set('Language', payload.language);
    form.set('Category', payload.category);
    form.set('Components', JSON.stringify(components));

    const endpoints = [
      'https://messaging.twilio.com/v1/Channels/WhatsApp/Templates',
      'https://messaging.twilio.com/v1/WhatsApp/Templates'
    ];

    for (const url of endpoints) {
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form.toString(),
        } as any);

        const text = await resp.text();
        let json: any = undefined;
        try { json = JSON.parse(text); } catch { /* not json */ }

        if (resp.ok) {
          return {
            success: true,
            status: (json && (json.status || json.review_status)) || 'submitted',
            templateId: (json && (json.sid || json.id)) || undefined,
            provider: 'twilio',
            raw: json || text,
          };
        }

        // If 404, try next endpoint
        if (resp.status === 404) continue;

        // Otherwise return error from Twilio
        const errMsg = (json && (json.message || json.more_info)) || text || `HTTP ${resp.status}`;
        return { success: false, error: errMsg, raw: json || text };
      } catch (e: any) {
        // Try next endpoint on network/parse error
        continue;
      }
    }

    return { success: false, error: 'Failed to submit template: no compatible API endpoint responded' };
  }
}

export default TwilioTemplatesService.getInstance();
