import twilio from 'twilio';
import * as dotenv from 'dotenv';
import { MongoDBService } from './mongodb.service';
import { OpenAIService } from './openai.service';

dotenv.config();

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export class TwilioService {
  private static instance: TwilioService;
  private client: twilio.Twilio;
  private phoneNumber: string;
  private mongodbService!: MongoDBService;
  private openaiService!: OpenAIService;
  
  private constructor(config: TwilioConfig) {
    this.client = twilio(config.accountSid, config.authToken);
    this.phoneNumber = config.phoneNumber;
  }

  private normalizeE164(raw: string): string {
    try {
      let p = (raw || '').toString().trim();
      // Strip any whatsapp: prefix and non-digits except leading '+'
      p = p.replace(/^whatsapp:/, '');
      if (p.startsWith('+')) return p;
      const digits = p.replace(/\D/g, '');
      if (!digits) return p;
const cc = (process.env.DEFAULT_COUNTRY_CODE || '1').replace(/\D/g, '');
      return `+${cc}${digits}`;
    } catch {
      return raw;
    }
  }

  public static getInstance(): TwilioService {
    if (!TwilioService.instance) {
      const config: TwilioConfig = {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || ''
      };

      if (!config.accountSid || !config.authToken || !config.phoneNumber) {
        throw new Error('Twilio credentials not found in environment variables. Please check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER');
      }

      TwilioService.instance = new TwilioService(config);
    }
    return TwilioService.instance;
  }

  public async initialize(): Promise<void> {
    this.mongodbService = MongoDBService.getInstance();
    this.openaiService = OpenAIService.getInstance();
    await this.mongodbService.connect();
  }

  public async sendMessage(to: string, message: string): Promise<boolean> {
    // Backward-compatible: defaults to WhatsApp if TWILIO_PHONE_NUMBER is set with whatsapp: prefix
    try {
      const fromAddr = this.phoneNumber.startsWith('whatsapp:') ? this.phoneNumber : `whatsapp:${this.phoneNumber}`;
      const toAddr = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      const result = await this.client.messages.create({
        body: message,
        from: fromAddr,
        to: toAddr,
      });

      console.log(`WhatsApp message sent. SID: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  public async sendSms(to: string, message: string): Promise<boolean> {
    try {
      const fromNumber = this.phoneNumber.replace(/^whatsapp:/, '');
      const toNumber = this.normalizeE164(to);
      const result = await this.client.messages.create({
        body: message,
        from: fromNumber,
        to: toNumber,
      });
      console.log(`SMS sent successfully. SID: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  public async handleIncomingMessage(from: string, message: string): Promise<void> {
    // Process asynchronously to return webhook response immediately
    setImmediate(async () => {
      try {
        console.log(`Received message from ${from}: ${message}`);
        const e164 = from.replace('whatsapp:', '');

        // Ensure a lead record exists for this phone (sets defaults on insert)
        try { await this.mongodbService.upsertLeadByPhone(e164, {}); } catch {}

        // Store user message in chat history (store without whatsapp: prefix)
        await this.mongodbService.addMessageToChatHistory(e164, 'user', message, {
          phone: e164,
          channel: 'whatsapp',
          labels: ['whatsapp']
        });

        // Determine if we should capture or request the user's name
        const awaitingName = await this.mongodbService.getAwaitingName(e164);
        const lead = await this.mongodbService.getLeadByPhone(e164);
        const hasName = Boolean((lead as any)?.name);

        // Try to extract a name on every inbound if we don't already have one or we're awaiting it
        const extracted = this.extractNameFromText(message);
        if (extracted && (!hasName || awaitingName)) {
          // Extra validation: ensure extracted name is not a phone number
          const isValidName = extracted && !/\d/.test(extracted) && extracted.length >= 2;
          if (isValidName) {
            await this.mongodbService.upsertLeadNameByPhone(e164, extracted);
            await this.mongodbService.setChatMetadataFields(e164, { customerName: extracted });
            await this.mongodbService.setAwaitingName(e164, false);
            console.log(`✓ Name captured for ${e164}: ${extracted}`);
          }
        }

        // Get chat history for context
        const chatHistory = await this.mongodbService.getChatHistory(e164);
        const conversationHistory = chatHistory?.messages || [];

        // Get relevant knowledge base context
        const knowledgeContext = await this.mongodbService.getRelevantKnowledge(message);

        // Generate AI response
        const aiResponse = await this.openaiService.generateResponse(
          message,
          conversationHistory.map(m => ({ role: m.role, content: m.content })),
          knowledgeContext
        );

        // Store AI response in chat history
        await this.mongodbService.addMessageToChatHistory(e164, 'assistant', aiResponse, {
          phone: e164,
          channel: 'whatsapp',
          labels: ['whatsapp']
        });

        // Send AI response back to customer (ensure proper whatsapp: addressing)
        await this.sendMessage(e164, aiResponse);

        // After replying, if we still don't have a name and we're not already awaiting it, ask for an intro
        const needName = !(await this.mongodbService.getLeadByPhone(e164))?.name;
        const stillAwaiting = await this.mongodbService.getAwaitingName(e164);
        if (needName && !stillAwaiting) {
          await this.mongodbService.setAwaitingName(e164, true);
          const intro = "Before we continue, I don't believe we've been properly introduced—I'm Genie. And you are?";
          await this.sendMessage(e164, intro);
        }
      } catch (error) {
        console.error('Error handling incoming message:', error);
        // Best-effort error notification
        try { await this.sendMessage(from, 'Sorry, I encountered an error. Please try again later.'); } catch {}
      }
    });
  }

  public async sendIntroduction(to: string): Promise<void> {
    const introMessage = `Hello! I'm your AI assistant for industrial metal products. I can help you with:
- Product information and specifications
- Pricing and availability
- Technical support
- Order assistance

How can I help you today?`;

    await this.sendMessage(to, introMessage);
  }

  public async sendScheduledPromotions(daysInactive: number = 3): Promise<void> {
    try {
      const inactiveCustomers = await this.mongodbService.getInactiveCustomers(daysInactive);
      const products = await this.mongodbService.getProductsToPromote();

      for (const customer of inactiveCustomers) {
        if (products.length > 0) {
          const product = products[Math.floor(Math.random() * products.length)];
          const promotionMessage = await this.openaiService.generatePromotion(
            `Product: ${product.name}, Description: ${product.description}, Price: $${product.price}`
          );

          await this.sendMessage(customer.phone, promotionMessage);
          await this.mongodbService.updateLastContact(customer.phone);
        }
      }

      console.log(`Sent promotions to ${inactiveCustomers.length} inactive customers`);
    } catch (error) {
      console.error('Error sending scheduled promotions:', error);
    }
  }

  public async sendBulkMessage(phoneNumbers: string[], message: string): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const phoneNumber of phoneNumbers) {
      const result = await this.sendMessage(phoneNumber, message);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  public async getMessageStatus(messageSid: string): Promise<string> {
    try {
      const message = await this.client.messages(messageSid).fetch();
      return message.status;
    } catch (error) {
      console.error('Error fetching message status:', error);
      return 'unknown';
    }
  }

  public async getAccountInfo(): Promise<{ accountSid: string; phoneNumber: string; balance: string }> {
    try {
      const account = await this.client.api.accounts(this.client.accountSid).fetch();
      const balance = await this.client.api.balance.fetch();
      return {
        accountSid: account.sid,
        phoneNumber: this.phoneNumber,
        balance: balance.balance
      };
    } catch (error) {
      console.error('Error fetching account info:', error);
      throw error;
    }
  }

  // Simple name extraction that won't disrupt conversation
  private extractNameFromText(text: string): string | null {
    try {
      const raw = (text || '').trim();
      if (!raw) return null;

      // Reject any text that contains digits (phone numbers, etc.)
      if (/\d/.test(raw)) return null;

      // Common patterns: "I'm X", "I am X", "This is X", "My name is X"
      const patterns = [
        /(my\s+name\s*'?s?\s+is|i am|i'm|this is|it is|it's)\s+([A-Za-z][A-Za-z'\- ]{1,40})/i
      ];
      for (const re of patterns) {
        const m = raw.match(re);
        if (m) {
          const candidate = m[2];
          // Double check no digits in extracted name
          if (/\d/.test(candidate)) continue;
          const cleaned = this.cleanName(candidate);
          if (cleaned) return cleaned;
        }
      }

      // If the message is short and looks like a name (<= 3 words, mostly letters)
      const words = raw.split(/\s+/).filter(Boolean);
      const greetings = ['hi', 'hello', 'hey', 'good', 'morning', 'evening', 'afternoon'];
      const onlyLetters = /^[A-Za-z][A-Za-z'\- ]{0,40}$/;
      if (words.length > 0 && words.length <= 3 && onlyLetters.test(raw.toLowerCase().replace(/\b(?:from|at|of)\b.*$/i, '').trim())) {
        const lower = raw.toLowerCase();
        if (!greetings.some(g => lower.includes(g))) {
          const cleaned = this.cleanName(raw);
          if (cleaned) return cleaned;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private cleanName(candidate: string): string | null {
    // First check: reject if contains any digits
    if (/\d/.test(candidate)) return null;
    
    const stopTokens = /( from | at | of | the |\,|\.|\||\-|\+|\(|\))/i;
    let name = candidate.split('\n')[0];
    const idx = name.search(stopTokens);
    if (idx > 0) name = name.slice(0, idx);
    name = name.replace(/[^A-Za-z'\- ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!name) return null;
    
    // Reject if still contains digits after cleaning
    if (/\d/.test(name)) return null;
    
    // Title Case
    name = name.split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    
    // Basic sanity checks
    if (name.length < 2) return null;
    
    // Reject common non-name words
    const invalidNames = ['yes', 'no', 'ok', 'okay', 'sure', 'thanks', 'thank', 'please', 'hi', 'hello', 'hey'];
    if (invalidNames.includes(name.toLowerCase())) return null;
    
    return name;
  }
}
