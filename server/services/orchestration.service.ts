import { TwilioService } from './twilio.service';
import { MongoDBService } from './mongodb.service';
import { OpenAIService } from './openai.service';

export type ConversationState = 
  | 'NEW'           // Customer has not been contacted yet
  | 'INTRO_SENT'    // Intro message sent, waiting for response
  | 'AI_ACTIVE'     // Customer replied, AI is handling conversation
  | 'SCHEDULED_FOLLOWUP' // No reply, scheduled messages active
  | 'ADMIN_TAKEOVER'     // Admin manually took over conversation
  | 'INACTIVE';          // Customer hasn't responded for extended period

export interface ConversationFlow {
  customerId: string;
  phoneNumber: string;
  state: ConversationState;
  lastMessageAt: Date;
  introSentAt?: Date;
  lastAIResponse?: Date;
  scheduledFollowups: Array<{
    messageId: string;
    scheduledAt: Date;
    message: string;
    sent: boolean;
  }>;
  adminOverride: boolean;
  metadata: {
    engagementScore: number;
    responseCount: number;
    lastCampaignId?: string;
  };
}

/**
 * Orchestration Service - Manages conversation flow and campaign automation
 */
export class OrchestrationService {
  private static instance: OrchestrationService;
  private twilioService!: TwilioService;
  private mongodbService!: MongoDBService;
  private openaiService!: OpenAIService;
  
  // Simple in-memory scheduler - in production, use Redis or dedicated job queue
  private scheduledTasks = new Map<string, NodeJS.Timeout>();
  
  private constructor() {}
  
  public static getInstance(): OrchestrationService {
    if (!OrchestrationService.instance) {
      OrchestrationService.instance = new OrchestrationService();
    }
    return OrchestrationService.instance;
  }
  
  public async initialize(): Promise<void> {
    this.twilioService = TwilioService.getInstance();
    this.mongodbService = MongoDBService.getInstance();
    this.openaiService = OpenAIService.getInstance();
    
    console.log('🤖 Orchestration Service initialized');
  }
  
  /**
   * Handle incoming customer message and orchestrate response flow
   */
  public async handleIncomingMessage(phoneNumber: string, message: string): Promise<void> {
    try {
      console.log(`🔄 Orchestrating message from ${phoneNumber}`);
      
      // Get or create conversation flow
      const conversation = await this.getConversationFlow(phoneNumber);
      
      // Cancel any pending follow-ups (customer replied!)
      this.cancelScheduledFollowups(phoneNumber);
      
      // Update conversation state
      conversation.state = 'AI_ACTIVE';
      conversation.lastMessageAt = new Date();
      conversation.metadata.responseCount++;
      conversation.adminOverride = false; // Customer message resets admin override
      
      // Save updated conversation state
      await this.saveConversationFlow(conversation);
      
      // Let AI handle the response (this will be called by TwilioService)
      console.log(`✅ Customer ${phoneNumber} is now in AI_ACTIVE state`);
      
    } catch (error) {
      console.error('Error in message orchestration:', error);
    }
  }
  
  /**
   * Send intro message to a lead and set up follow-up sequence
   */
  public async sendIntroMessage(phoneNumber: string, campaignId?: string): Promise<void> {
    try {
      const conversation = await this.getConversationFlow(phoneNumber);
      
      // Send introduction message
      await this.twilioService.sendIntroduction(phoneNumber);
      
      // Update conversation state
      conversation.state = 'INTRO_SENT';
      conversation.introSentAt = new Date();
      conversation.lastMessageAt = new Date();
      if (campaignId) {
        conversation.metadata.lastCampaignId = campaignId;
      }
      
      await this.saveConversationFlow(conversation);
      
      // Schedule follow-up messages if no reply
      await this.scheduleFollowupSequence(phoneNumber);
      
      console.log(`📨 Intro message sent to ${phoneNumber}, follow-ups scheduled`);
      
    } catch (error) {
      console.error('Error sending intro message:', error);
    }
  }
  
  /**
   * Schedule follow-up message sequence for leads who don't reply
   */
  private async scheduleFollowupSequence(phoneNumber: string): Promise<void> {
    const followupMessages = [
      {
        delayHours: 24,
        message: "Hi! Just following up on our previous message. We have some great industrial metal solutions that might interest you. Any questions I can help with?"
      },
      {
        delayHours: 72, // 3 days
        message: "Hope you're doing well! We're here whenever you need quality metal products or have technical questions. What projects are you working on?"
      },
      {
        delayHours: 168, // 1 week
        message: "Final check-in! Our team is ready to help with any industrial metal needs. Feel free to reach out anytime for quotes or technical support."
      }
    ];
    
    for (const followup of followupMessages) {
      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + followup.delayHours);
      
      const taskId = `${phoneNumber}-${followup.delayHours}h`;
      const timeout = setTimeout(async () => {
        await this.sendFollowupMessage(phoneNumber, followup.message, taskId);
      }, followup.delayHours * 60 * 60 * 1000); // Convert to milliseconds
      
      this.scheduledTasks.set(taskId, timeout);
      
      console.log(`⏰ Scheduled follow-up for ${phoneNumber} in ${followup.delayHours} hours`);
    }
  }
  
  /**
   * Send a scheduled follow-up message
   */
  private async sendFollowupMessage(phoneNumber: string, message: string, taskId: string): Promise<void> {
    try {
      const conversation = await this.getConversationFlow(phoneNumber);
      
      // Only send if still waiting for reply and no admin override
      if (conversation.state === 'INTRO_SENT' || conversation.state === 'SCHEDULED_FOLLOWUP') {
        if (!conversation.adminOverride) {
          await this.twilioService.sendMessage(phoneNumber, message);
          
          conversation.state = 'SCHEDULED_FOLLOWUP';
          conversation.lastMessageAt = new Date();
          await this.saveConversationFlow(conversation);
          
          console.log(`📤 Follow-up sent to ${phoneNumber}`);
        }
      }
      
      // Clean up scheduled task
      this.scheduledTasks.delete(taskId);
      
    } catch (error) {
      console.error('Error sending follow-up message:', error);
      this.scheduledTasks.delete(taskId);
    }
  }
  
  /**
   * Cancel all scheduled follow-ups for a phone number (customer replied)
   */
  private cancelScheduledFollowups(phoneNumber: string): void {
    let canceledCount = 0;
    
    for (const [taskId, timeout] of this.scheduledTasks.entries()) {
      if (taskId.startsWith(phoneNumber)) {
        clearTimeout(timeout);
        this.scheduledTasks.delete(taskId);
        canceledCount++;
      }
    }
    
    if (canceledCount > 0) {
      console.log(`❌ Canceled ${canceledCount} follow-up messages for ${phoneNumber}`);
    }
  }
  
  /**
   * Admin takes over conversation
   */
  public async adminTakeOver(phoneNumber: string, adminId: string): Promise<void> {
    try {
      const conversation = await this.getConversationFlow(phoneNumber);
      
      // Cancel scheduled follow-ups
      this.cancelScheduledFollowups(phoneNumber);
      
      // Update state
      conversation.state = 'ADMIN_TAKEOVER';
      conversation.adminOverride = true;
      conversation.lastMessageAt = new Date();
      
      await this.saveConversationFlow(conversation);
      
      console.log(`👤 Admin ${adminId} took over conversation with ${phoneNumber}`);
      
    } catch (error) {
      console.error('Error in admin takeover:', error);
    }
  }
  
  /**
   * Get conversation flow state for a phone number
   */
  private async getConversationFlow(phoneNumber: string): Promise<ConversationFlow> {
    try {
      // Try to get existing conversation from database
      // For now, create a simple in-memory version
      // In production, this should be stored in MongoDB
      
      return {
        customerId: phoneNumber, // Use phone as ID for now
        phoneNumber,
        state: 'NEW',
        lastMessageAt: new Date(),
        scheduledFollowups: [],
        adminOverride: false,
        metadata: {
          engagementScore: 0,
          responseCount: 0
        }
      };
      
    } catch (error) {
      console.error('Error getting conversation flow:', error);
      throw error;
    }
  }
  
  /**
   * Save conversation flow state
   */
  private async saveConversationFlow(conversation: ConversationFlow): Promise<void> {
    try {
      // In production, save to MongoDB
      // For now, just log the state change
      console.log(`💾 Conversation state updated: ${conversation.phoneNumber} -> ${conversation.state}`);
      
    } catch (error) {
      console.error('Error saving conversation flow:', error);
    }
  }
  
  /**
   * Get conversation statistics
   */
  public async getConversationStats(): Promise<{
    total: number;
    aiActive: number;
    awaitingReply: number;
    adminControlled: number;
    scheduled: number;
  }> {
    // Return mock stats for now - implement with real data later
    return {
      total: this.scheduledTasks.size + 10,
      aiActive: 5,
      awaitingReply: 3,
      adminControlled: 1,
      scheduled: this.scheduledTasks.size
    };
  }
  
  /**
   * Cleanup method for graceful shutdown
   */
  public cleanup(): void {
    for (const [taskId, timeout] of this.scheduledTasks.entries()) {
      clearTimeout(timeout);
    }
    this.scheduledTasks.clear();
    console.log('🧹 Orchestration Service cleaned up');
  }
}

export default OrchestrationService.getInstance();