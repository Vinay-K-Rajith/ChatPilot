import * as dotenv from 'dotenv';
import type { MongoDBService, Customer, Product, LegacyKnowledgeBase } from './mongodb.service';
import type { OpenAIService } from './openai.service';
import { default as openaiService } from './openai.service';

// Will be imported dynamically to avoid circular dependency
let mongodbService: any;

dotenv.config();

/**
 * WhatsApp Service - Singleton implementation for WhatsApp API integration
 * Handles all interactions with WhatsApp Business API
 */
export class WhatsAppService {
  private static instance: WhatsAppService;
  private apiUrl: string;
  private authToken: string;
  private phoneNumberId: string;
  private mongodbService!: MongoDBService;
  
  private constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
    this.authToken = process.env.WHATSAPP_AUTH_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    
    // Import MongoDB service dynamically to avoid circular dependency
    import('./mongodb.service').then(module => {
      mongodbService = module.default;
      this.mongodbService = mongodbService;
    });
  }
  
  /**
   * Get the singleton instance of WhatsAppService
   */
  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    
    return WhatsAppService.instance;
  }
  
  /**
   * Send a message to a WhatsApp user
   * @param to Recipient's phone number
   * @param message Message content
   */
  public async sendMessage(to: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'text',
            text: { body: message },
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Message sent successfully:', data);
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }
  
  /**
   * Handle incoming messages from WhatsApp
   * @param from Sender's phone number
   * @param message Message content
   */
  public async handleIncomingMessage(from: string, message: string): Promise<void> {
    try {
      // Check if this is a new lead or existing customer
      const customer = await mongodbService.findCustomer(from);
      
      if (!customer) {
        // New lead - send introduction message
        await this.sendIntroduction(from);
        // Save new lead to database
        await mongodbService.saveCustomer({
          phone: from,
          lastContact: new Date(),
          conversationHistory: [{
            role: 'system',
            content: 'Introduction sent'
          }, {
            role: 'user',
            content: message
          }]
        });
      } else {
        // Get relevant knowledge base context
        const knowledgeBaseContext = await mongodbService.searchKnowledgeBase(message);
        
        // Generate AI response with context
         const aiResponse = await openaiService.generateResponse(
           message,
           customer.conversationHistory,
           knowledgeBaseContext
         );
        
        // Send response back to customer
        await this.sendMessage(from, aiResponse);
        
        // Update conversation history
        customer.conversationHistory.push({ role: 'user', content: message });
        customer.conversationHistory.push({ role: 'assistant', content: aiResponse });
        await mongodbService.updateConversationHistory(from, customer.conversationHistory);
        
        // Update last contact date
        await mongodbService.updateLastContact(from);
      }
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }
  
  /**
   * Send introduction message to new leads
   * @param to Recipient's phone number
   */
  private async sendIntroduction(to: string): Promise<void> {
    const introMessage = 
      "👋 Hello! I'm your AI assistant. I can help answer questions about our products and services. " +
      "How can I assist you today?";
    
    await this.sendMessage(to, introMessage);
  }
  
  /**
   * Send scheduled promotional messages to leads
   * @param daysInactive Number of days since last interaction
   */
  public async sendScheduledPromotions(daysInactive: number = 3): Promise<void> {
    try {
      // Get inactive customers
      const inactiveCustomers = await mongodbService.getInactiveCustomers(daysInactive);
      
      // Get products to promote
      const products = await mongodbService.getProductsToPromote();
      
      for (const customer of inactiveCustomers) {
        // Select a random product to promote
        const product = products[Math.floor(Math.random() * products.length)];
        
        // Generate promotional message
        const promoMessage = await openaiService.generatePromotion(product.description);
        
        // Send promotional message
        await this.sendMessage(customer.phone, promoMessage);
        
        // Update last contact date
        await mongodbService.updateLastContact(customer.phone);
      }
    } catch (error) {
      console.error('Error sending scheduled promotions:', error);
    }
  }
}

// Export a default instance
export default WhatsAppService.getInstance();