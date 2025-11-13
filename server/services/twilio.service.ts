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

  /**
   * Split message at sentence boundaries if it exceeds the WhatsApp character limit.
   * WhatsApp hard-limits message size (~1600 chars). We use 1500 as a safe threshold.
   */
  private splitMessageBySentences(message: string, maxLength: number = 1500): string[] {
    try {
      if (!message || message.length <= maxLength) return [message];

      const parts: string[] = [];
      let current = '';
      const sentences = message.split(/(?<=[.!?])\s+/);

      for (const s of sentences) {
        const seg = s.trim();
        if (!seg) continue;
        if (current.length + seg.length + 1 > maxLength && current.length > 0) {
          parts.push(current.trim());
          current = seg;
        } else {
          current = current ? `${current} ${seg}` : seg;
        }
      }
      if (current.trim()) parts.push(current.trim());

      // If split somehow failed, fall back to chunking by maxLength
      if (parts.length === 0) {
        for (let i = 0; i < message.length; i += maxLength) {
          parts.push(message.slice(i, i + maxLength));
        }
      }
      return parts;
    } catch {
      return [message];
    }
  }

  public async sendMessage(to: string, message: string): Promise<boolean> {
    // Backward-compatible: defaults to WhatsApp if TWILIO_PHONE_NUMBER is set with whatsapp: prefix
    try {
      const fromAddr = this.phoneNumber.startsWith('whatsapp:') ? this.phoneNumber : `whatsapp:${this.phoneNumber}`;
      const toAddr = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      const chunks = this.splitMessageBySentences(message, 1500);
      for (let i = 0; i < chunks.length; i++) {
        const part = chunks[i];
        if (!part?.trim()) continue;
        const result = await this.client.messages.create({
          body: part,
          from: fromAddr,
          to: toAddr,
        });
        console.log(`WhatsApp message sent. SID: ${result.sid}`);
        if (i < chunks.length - 1) {
          await new Promise(r => setTimeout(r, 150));
        }
      }
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  /**
   * Send an approved WhatsApp template using Twilio Content API.
   * Uses contentSid with optional contentVariables for personalization.
   * Always sends via WhatsApp channel.
   */
  public async sendContentMessage(to: string, contentSid: string, variables?: Record<string, any>): Promise<boolean> {
    try {
      const fromAddr = this.phoneNumber.startsWith('whatsapp:') ? this.phoneNumber : `whatsapp:${this.phoneNumber}`;
      const toAddr = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      const payload: any = {
        from: fromAddr,
        to: toAddr,
        contentSid,
      };
      if (variables && Object.keys(variables).length > 0) {
        payload.contentVariables = JSON.stringify(variables);
      }
      console.log('[twilio] sending content message', { to: toAddr, contentSid, variables });
      const result = await (this.client as any).messages.create(payload);
      console.log(`WhatsApp template message sent. SID: ${result.sid}`);
      return true;
    } catch (error: any) {
      console.error('Error sending WhatsApp content message:', { to, contentSid, error: error?.message || error });
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

        // Check for training enrollment triggers FIRST
        if (this.isTrainingEnrollmentMessage(message)) {
          // Record the inbound once
          await this.mongodbService.addMessageToChatHistory(e164, 'user', message, {
            phone: e164,
            channel: 'whatsapp',
            labels: ['whatsapp']
          });
          await this.startTrainingFlow(e164);
          return;
        }

        // If already in training mode, store message in GMT_CH first, then delegate handling
        const inTraining = await this.mongodbService.isInTrainingMode(e164);
        if (inTraining) {
          await this.mongodbService.addMessageToChatHistory(e164, 'user', message, {
            phone: e164,
            channel: 'whatsapp',
            labels: ['whatsapp', 'training']
          });
          await this.handleTrainingMessage(e164, message);
          return;
        }

        // Not in training: store inbound to general chat history once
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

        // Get user's name from leads table for personalization
        const updatedLead = await this.mongodbService.getLeadByPhone(e164);
        const userName = updatedLead?.name && typeof updatedLead.name === 'string' && /^[A-Za-z][A-Za-z'\- ]{1,40}$/.test(updatedLead.name) 
          ? updatedLead.name 
          : undefined;

        // Generate AI response with user's name for personalization
        const aiResponse = await this.openaiService.generateResponse(
          message,
          conversationHistory.map(m => ({ role: m.role, content: m.content })),
          knowledgeContext,
          undefined, // systemPrompt
          undefined, // pdfContext
          userName   // userName for personalization
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

  // ============== Training Flow Methods ==============

  /**
   * Check if message indicates partner enrollment/training request
   */
  private isTrainingEnrollmentMessage(message: string): boolean {
    const lower = message.toLowerCase().trim();
    const enrollmentPhrases = [
      'i am a new partner',
      "i'm a new partner",
      'i am enrolled',
      "i'm enrolled",
      'new partner',
      'start training',
      'begin training',
      'partner onboarding',
      'i want to enroll',
      'enroll me'
    ];
    
    return enrollmentPhrases.some(phrase => lower.includes(phrase));
  }

  /**
   * Start the training flow - send welcome and first section
   */
  private async startTrainingFlow(phone: string): Promise<void> {
    try {
      // Get user's name for personalization
      const lead = await this.mongodbService.getLeadByPhone(phone);
      const userName = lead?.name && typeof lead.name === 'string' && /^[A-Za-z][A-Za-z'\- ]{1,40}$/.test(lead.name) 
        ? lead.name 
        : 'Partner';

      // Start training mode
      await this.mongodbService.startTrainingMode(phone);

      // Get training sections
      const sections = await this.mongodbService.getTrainingSections();
      
      if (sections.length === 0) {
        await this.sendMessage(phone, "Sorry, training content is not available at the moment. Please contact support.");
        await this.mongodbService.exitTrainingMode(phone);
        return;
      }

      // Send welcome message (minimal emojis)
      const welcomeMsg = `Welcome ${userName}!\n\nI'm glad you're here. Let's get you started with your partner training.\n\n` +
        `We have ${sections.length} training sessions designed to help you succeed. ` +
        `Each session builds on the previous one, so we'll go through them at your own pace.\n\n` +
        `Let's start with Session 1.`;
      
      await this.sendMessage(phone, welcomeMsg);

      // Small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Send first section
      const firstSectionSNo = sections[0].s_no;
      await this.sendTrainingSection(phone, firstSectionSNo);
      
      console.log(`✓ Training started for ${phone}`);
    } catch (error) {
      console.error('Error starting training flow:', error);
      await this.sendMessage(phone, "Sorry, I encountered an error starting your training. Please try again or contact support.");
    }
  }

  /**
   * Send a specific training section with interactive buttons
   */
  private async sendTrainingSection(phone: string, sectionNo: number): Promise<void> {
    try {
      console.log(`[Training] Sending section ${sectionNo} to ${phone}`);
      
      const sections = await this.mongodbService.getTrainingSections();
      const section = sections.find(s => s.s_no === sectionNo);
      
      if (!section) {
        console.error(`[Training] Section ${sectionNo} not found`);
        await this.sendMessage(phone, "This training section doesn't exist. Let me help you with the available sessions.");
        await this.showTrainingMenu(phone);
        return;
      }

      // Get user's name
      const lead = await this.mongodbService.getLeadByPhone(phone);
      const userName = lead?.name && typeof lead.name === 'string' && /^[A-Za-z][A-Za-z'\- ]{1,40}$/.test(lead.name) 
        ? lead.name 
        : undefined;

      const nameGreeting = userName ? `${userName}, ` : '';
      
      // Send section heading and content (minimal emojis)
      const sectionMsg = `*Session ${section.s_no}: ${section.heading}*\n\n${section.content}\n\n` +
        `${nameGreeting}feel free to ask me questions about this session.`;
      
      await this.sendMessage(phone, sectionMsg);
      console.log(`[Training] Sent section ${sectionNo} to ${phone}`);
      
      // Send interactive buttons
      await this.sendTrainingButtons(phone, sectionNo, sections.length);
      
      // Store in both Training_Progress AND GMT_CH for conversation visibility
      try {
        // Store in Training_Progress (section-specific history)
        await this.mongodbService.addTrainingMessage(phone, sectionNo, 'assistant', sectionMsg);
        
        // Store in GMT_CH (general conversation history for Conversations tab)
        await this.mongodbService.addMessageToChatHistory(phone, 'assistant', sectionMsg, {
          phone,
          channel: 'whatsapp',
          labels: ['whatsapp', 'training']
        });
        
        console.log(`[Training] Stored section ${sectionNo} in both histories`);
      } catch (storeError) {
        console.error(`[Training] Failed to store section ${sectionNo}:`, storeError);
      }
      
    } catch (error) {
      console.error('[Training] Error sending training section:', error);
      await this.sendMessage(phone, "Sorry, I had trouble loading that session. Please try again.");
    }
  }

  /**
   * Send interactive buttons for training navigation.
   * Tries WhatsApp interactive buttons first; falls back to text options if unsupported.
   */
  private async sendTrainingButtons(phone: string, currentSection: number, totalSections: number): Promise<void> {
    try {
      // Build button options based on current position
      const btnTitles: string[] = [];
      if (currentSection < totalSections) btnTitles.push('Next');
      if (currentSection > 1) btnTitles.push('Previous');
      btnTitles.push('Menu');
      btnTitles.push('Complete');
      if (currentSection === totalSections) btnTitles.push('Exit');

      const fromAddr = this.phoneNumber.startsWith('whatsapp:') ? this.phoneNumber : `whatsapp:${this.phoneNumber}`;
      const toAddr = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;

      // Try WhatsApp interactive buttons via Twilio API (best UX)
      const interactivePayload: any = {
        from: fromAddr,
        to: toAddr,
        interactive: {
          type: 'button',
          body: { text: 'Options' },
          action: {
            buttons: btnTitles.map(t => ({ type: 'reply', reply: { id: t.toLowerCase(), title: t } }))
          }
        }
      };

      try {
        await (this.client as any).messages.create(interactivePayload);
        return;
      } catch (e: any) {
        console.warn('[Training] Interactive buttons not supported, falling back to text.', e?.message || String(e));
      }

      // Fallback to plain text options
      const buttonMsg = `\nReply with: ${btnTitles.map(t => `*${t.toLowerCase()}*`).join(' | ')}`;
      await this.sendMessage(phone, buttonMsg);
    } catch (error) {
      console.error('[Training] Error sending buttons:', error);
      const fallbackMsg = `You can type: next, previous, menu, complete, or exit`;
      await this.sendMessage(phone, fallbackMsg);
    }
  }

  /**
   * Handle messages during training mode
   */
  private async handleTrainingMessage(phone: string, message: string): Promise<void> {
    try {
      const lower = message.toLowerCase().trim();
      const progress = await this.mongodbService.getOrCreateTrainingProgress(phone);
      const currentSection = progress.currentSection;

      // Handle menu commands
      if (lower === 'menu' || lower === 'help' || lower === 'options') {
        await this.showTrainingMenu(phone);
        return;
      }

      // Handle next/continue
      if (lower === 'next' || lower === 'continue' || lower === 'proceed') {
        await this.handleNextSection(phone, currentSection);
        return;
      }

      // Handle previous
      if (lower === 'previous' || lower === 'back' || lower === 'prev') {
        await this.handlePreviousSection(phone, currentSection);
        return;
      }

      // Handle complete/done for current section
      if (lower === 'complete' || lower === 'done' || lower === 'finished') {
        await this.handleCompleteSection(phone, currentSection);
        return;
      }

      // Handle exit
      if (lower === 'exit' || lower === 'quit' || lower === 'stop training') {
        await this.handleExitTraining(phone);
        return;
      }

      // Handle restart
      if (lower === 'restart' || lower === 'start over') {
        await this.handleRestartTraining(phone);
        return;
      }

      // Handle jump to specific section
      const sectionMatch = message.match(/(?:section|session)\s*(\d+)/i);
      if (sectionMatch) {
        const targetSection = parseInt(sectionMatch[1], 10);
        await this.handleJumpToSection(phone, targetSection);
        return;
      }

      // Otherwise, treat as a question about the current section
      await this.handleTrainingQuestion(phone, currentSection, message);
      
    } catch (error) {
      console.error('Error handling training message:', error);
      await this.sendMessage(phone, "Sorry, I encountered an error. Type 'menu' to see your options or 'exit' to leave training.");
    }
  }

  /**
   * Show training menu with available options
   */
  private async showTrainingMenu(phone: string): Promise<void> {
    const progress = await this.mongodbService.getOrCreateTrainingProgress(phone);
    const sections = await this.mongodbService.getTrainingSections();
    const totalSections = sections.length;
    const completedCount = progress.completedSections.length;
    
    const menuMsg = `*Training Menu*\n\n` +
      `Progress: ${completedCount}/${totalSections} sessions completed\n` +
      `Current: Session ${progress.currentSection}\n\n` +
      `*Available Commands:*\n` +
      `• next - Move to next session\n` +
      `• previous - Go back to previous session\n` +
      `• complete - Mark current session as done\n` +
      `• section [number] - Jump to a specific session\n` +
      `• restart - Start training from beginning\n` +
      `• exit - Exit training mode\n\n` +
      `You can also ask me questions about the current session anytime.`;
    
    // Store response in GMT_CH
    await this.mongodbService.addMessageToChatHistory(phone, 'assistant', menuMsg, {
      phone,
      channel: 'whatsapp',
      labels: ['whatsapp', 'training']
    });
    
    await this.sendMessage(phone, menuMsg);
  }

  /**
   * Handle moving to next section
   */
  private async handleNextSection(phone: string, currentSection: number): Promise<void> {
    const sections = await this.mongodbService.getTrainingSections();
    const currentIndex = sections.findIndex(s => s.s_no === currentSection);
    const nextIndex = currentIndex + 1;
    
    // Check if we're at the last section
    if (nextIndex >= sections.length) {
      const completionMsg = `*Congratulations!*\n\n` +
        `You've completed all ${sections.length} training sessions! ` +
        `You're now ready to start your journey as a partner.\n\n` +
        `If you need to review anything, type "section [number]" or "restart" to go through the training again.\n\n` +
        `Type "exit" when you're ready to leave training mode. Welcome to the team!`;
      
      // Mark current (last) section complete
      await this.mongodbService.markSectionCompleted(phone, currentSection);
      
      // Ensure all sections are marked complete
      const progress = await this.mongodbService.getTrainingProgress(phone);
      for (const section of sections) {
        if (!progress?.completedSections.includes(section.s_no)) {
          await this.mongodbService.markSectionCompleted(phone, section.s_no);
        }
      }
      
      // Store response in GMT_CH
      await this.mongodbService.addMessageToChatHistory(phone, 'assistant', completionMsg, {
        phone,
        channel: 'whatsapp',
        labels: ['whatsapp', 'training']
      });
      
      await this.sendMessage(phone, completionMsg);
      return;
    }
    
    // Persist progress: mark current as completed and move to next
    await this.mongodbService.markSectionCompleted(phone, currentSection);
    const nextSectionSNo = await this.mongodbService.moveToNextSection(phone);
    await this.sendTrainingSection(phone, nextSectionSNo);
  }

  /**
   * Handle moving to previous section
   */
  private async handlePreviousSection(phone: string, currentSection: number): Promise<void> {
    const sections = await this.mongodbService.getTrainingSections();
    const currentIndex = sections.findIndex(s => s.s_no === currentSection);
    
    // Check if we're at the first section
    if (currentIndex <= 0) {
      const errorMsg = "You're already at the first session! Type 'next' to continue or 'menu' for more options.";
      await this.mongodbService.addMessageToChatHistory(phone, 'assistant', errorMsg, {
        phone,
        channel: 'whatsapp',
        labels: ['whatsapp', 'training']
      });
      await this.sendMessage(phone, errorMsg);
      return;
    }
    
    const prevSectionSNo = await this.mongodbService.moveToPreviousSection(phone);
    await this.sendTrainingSection(phone, prevSectionSNo);
  }

  /**
   * Handle completing current section
   */
  private async handleCompleteSection(phone: string, sectionNo: number): Promise<void> {
    await this.mongodbService.markSectionCompleted(phone, sectionNo);
    
    const sections = await this.mongodbService.getTrainingSections();
    const progress = await this.mongodbService.getTrainingProgress(phone);
    const completedCount = progress?.completedSections.length || 0;
    
    const completeMsg = `Great job! Session ${sectionNo} marked as complete.\n\n` +
      `Progress: ${completedCount}/${sections.length} sessions completed\n\n` +
      `Type "next" to continue or "menu" for more options.`;
    
    // Store response in GMT_CH
    await this.mongodbService.addMessageToChatHistory(phone, 'assistant', completeMsg, {
      phone,
      channel: 'whatsapp',
      labels: ['whatsapp', 'training']
    });
    
    await this.sendMessage(phone, completeMsg);
  }

  /**
   * Handle exiting training mode
   */
  private async handleExitTraining(phone: string): Promise<void> {
    const progress = await this.mongodbService.getTrainingProgress(phone);
    const completedCount = progress?.completedSections.length || 0;
    const sections = await this.mongodbService.getTrainingSections();
    
    await this.mongodbService.exitTrainingMode(phone);
    
    const exitMsg = `You've exited training mode.\n\n` +
      `You completed ${completedCount} out of ${sections.length} sessions.\n\n` +
      `You can return anytime by saying "start training" or "I am a new partner". ` +
      `Your progress has been saved.\n\n` +
      `How else can I help you today?`;
    
    // Store response in GMT_CH
    await this.mongodbService.addMessageToChatHistory(phone, 'assistant', exitMsg, {
      phone,
      channel: 'whatsapp',
      labels: ['whatsapp', 'training']
    });
    
    await this.sendMessage(phone, exitMsg);
  }

  /**
   * Handle restarting training from beginning
   */
  private async handleRestartTraining(phone: string): Promise<void> {
    const sections = await this.mongodbService.getTrainingSections();
    const firstSectionSNo = sections.length > 0 ? sections[0].s_no : 1;
    
    await this.mongodbService.updateCurrentSection(phone, firstSectionSNo);
    
    const restartMsg = `Training restarted. Let's begin from Session 1.`;
    
    // Store response in GMT_CH
    await this.mongodbService.addMessageToChatHistory(phone, 'assistant', restartMsg, {
      phone,
      channel: 'whatsapp',
      labels: ['whatsapp', 'training']
    });
    
    await this.sendMessage(phone, restartMsg);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.sendTrainingSection(phone, firstSectionSNo);
  }

  /**
   * Handle jumping to a specific section by s_no
   */
  private async handleJumpToSection(phone: string, targetSectionSNo: number): Promise<void> {
    const sections = await this.mongodbService.getTrainingSections();
    const targetSection = sections.find(s => s.s_no === targetSectionSNo);
    
    if (!targetSection) {
      const errorMsg = `Session ${targetSectionSNo} not found. Type 'menu' to see available options.`;
      await this.mongodbService.addMessageToChatHistory(phone, 'assistant', errorMsg, {
        phone,
        channel: 'whatsapp',
        labels: ['whatsapp', 'training']
      });
      await this.sendMessage(phone, errorMsg);
      return;
    }
    
    await this.mongodbService.updateCurrentSection(phone, targetSectionSNo);
    await this.sendTrainingSection(phone, targetSectionSNo);
  }

  /**
   * Handle questions about the current training section
   */
  private async handleTrainingQuestion(phone: string, sectionNo: number, question: string): Promise<void> {
    try {
      console.log(`[Training Q&A] Processing question from ${phone}, section ${sectionNo}`);
      
      const sections = await this.mongodbService.getTrainingSections();
      const section = sections.find(s => s.s_no === sectionNo);
      
      if (!section) {
        console.error(`[Training Q&A] Section ${sectionNo} not found`);
        await this.sendMessage(phone, "I'm having trouble loading the current session. Type 'menu' for options.");
        return;
      }

      // Store user question in Training_Progress (section-specific) only
      try {
        await this.mongodbService.addTrainingMessage(phone, sectionNo, 'user', question);
      } catch (storeError) {
        console.error('[Training Q&A] Failed to store user question:', storeError);
        // Continue anyway - don't block the response
      }

      // Get conversation history for this section
      const progress = await this.mongodbService.getOrCreateTrainingProgress(phone);
      const sectionChat = await this.mongodbService.getTrainingChatHistory(phone, sectionNo);
      const conversationHistory = sectionChat.map((m: any) => ({
        role: m.role,
        content: m.content
      }));

      console.log(`[Training Q&A] Chat history length: ${conversationHistory.length}`);

      // Get user's name
      const lead = await this.mongodbService.getLeadByPhone(phone);
      const userName = lead?.name && typeof lead.name === 'string' && /^[A-Za-z][A-Za-z'\- ]{1,40}$/.test(lead.name) 
        ? lead.name 
        : undefined;

      // Generate AI response using training-specific prompt
      console.log(`[Training Q&A] Generating AI response...`);
      const response = await this.openaiService.generateTrainingResponse(
        question,
        section.heading,
        section.content,
        conversationHistory,
        userName
      );

      // Store assistant response in both histories
      try {
        // Store in Training_Progress (section-specific)
        await this.mongodbService.addTrainingMessage(phone, sectionNo, 'assistant', response);
        
        // Store in GMT_CH (general conversation for Conversations tab)
        await this.mongodbService.addMessageToChatHistory(phone, 'assistant', response, {
          phone,
          channel: 'whatsapp',
          labels: ['whatsapp', 'training']
        });
      } catch (storeError) {
        console.error('[Training Q&A] Failed to store assistant response:', storeError);
        // Continue anyway - user still gets the response
      }

      // Send response with inline reminder (minimal emojis)
      // Long responses will be split automatically by sendMessage()
      const responseWithReminder = `${response}\n\n_Type \"next\" to continue, or \"menu\" for more options._`;
      await this.sendMessage(phone, responseWithReminder);
      
      console.log(`[Training Q&A] Successfully handled question for ${phone}`);
      
    } catch (error) {
      console.error('[Training Q&A] Error handling training question:', error);
      await this.sendMessage(phone, "Sorry, I had trouble processing your question. Please try again or type 'menu' for options.");
    }
  }
}
