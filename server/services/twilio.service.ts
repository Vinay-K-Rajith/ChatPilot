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
    try {
      const fromAddr = this.phoneNumber.startsWith('whatsapp:') ? this.phoneNumber : `whatsapp:${this.phoneNumber}`;
      const toAddr = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      const result = await this.client.messages.create({
        body: message,
        from: fromAddr,
        to: toAddr,
      });

      console.log(`Message sent successfully. SID: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  public async handleIncomingMessage(from: string, message: string): Promise<void> {
    try {
      console.log(`Received message from ${from}: ${message}`);
      const e164 = from.replace('whatsapp:', '');
      
      // Store user message in chat history (store without whatsapp: prefix)
      await this.mongodbService.addMessageToChatHistory(e164, 'user', message);

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
      await this.mongodbService.addMessageToChatHistory(e164, 'assistant', aiResponse);

      // Send AI response back to customer (ensure proper whatsapp: addressing)
      await this.sendMessage(e164, aiResponse);

    } catch (error) {
      console.error('Error handling incoming message:', error);
      
      // Send error message to customer
      await this.sendMessage(from, 'Sorry, I encountered an error. Please try again later.');
    }
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
}
