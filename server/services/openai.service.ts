import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
import type { ChatCompletionMessageParam } from 'openai/resources';

dotenv.config();

/**
 * OpenAI Service - Singleton implementation for OpenAI API integration
 * Handles all interactions with OpenAI's API for generating responses
 */
export class OpenAIService {
  private static instance: OpenAIService;
  private openai: OpenAI;
  
  private constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  /**
   * Get the singleton instance of OpenAIService
   */
  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    
    return OpenAIService.instance;
  }
  
  /**
   * Generate a response using the OpenAI API with strict topic focus
   * @param message The user's message or prompt
   * @param conversationHistory Optional array of previous conversation messages
   * @param knowledgeBaseContext Optional context from the knowledge base
   * @param systemPrompt Optional system prompt override
   * @param pdfContext Optional context from PDF documents
   * @returns The AI-generated response
   */
  public async generateResponse(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    knowledgeBaseContext?: string,
    systemPrompt?: string,
    pdfContext?: string
  ): Promise<string> {
    try {
      // Define the core topic scope
      const coreTopic = "industrial metal products and services";
      
      // Create conversation summary for context
      const conversationSummary = this.createConversationSummary(conversationHistory);
      
  // Base system rules enforced by the server
  const baseSystemMessage = `You are an AI assistant specializing EXCLUSIVELY in ${coreTopic}. 

STRICT BEHAVIOR RULES:
1. ONLY answer questions related to industrial metal products, services, pricing, specifications, technical support, orders, and industry standards
2. If asked about ANYTHING outside this scope, politely redirect: "That's outside our discussion about ${coreTopic}. Let's continue with industrial metal products and services. How can I help you with our products today?"
3. Validate every response against the core topic before answering
4. If conversation drifts, remind: "Let's keep this about ${coreTopic}. Please provide relevant details about our products or services."
5. Periodically summarize: "So far, we've covered [key points]. What else about ${coreTopic} can I help you with?"

TOPICS YOU CAN DISCUSS:
- Steel sheets, pipes, beams, and structural components
- Aluminum products and alloys
- Copper, brass, and specialty metals
- Product specifications and dimensions
- Pricing and availability
- Technical applications and uses
- Industry standards and certifications
- Order processing and logistics
- Quality control and testing
- Custom fabrication services

${knowledgeBaseContext ? `Use this knowledge base information:\n\n${knowledgeBaseContext}\n\n` : ''}

${pdfContext ? `Additional PDF document context:\n\n${pdfContext}\n\n` : ''}

${conversationSummary ? `Previous conversation context:\n${conversationSummary}\n\n` : ''}

Be professional, helpful, and ALWAYS stay focused on ${coreTopic}. If unsure about relevance, ask clarifying questions about our products or services.`;

  // If client provided a systemPrompt, include it after the base rules so it supplements server-side safety
  const systemMessage = systemPrompt ? `${baseSystemMessage}\n\nClient guidance:\n${systemPrompt}` : baseSystemMessage;
        
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemMessage },
        ...conversationHistory.map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content
        })),
        { role: 'user', content: message }
      ];
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });
      
      const aiResponse = response.choices[0]?.message.content?.trim() || "I'm not sure how to respond to that.";
      
      // Post-process to ensure topic focus
      return this.validateAndEnforceTopicFocus(aiResponse, coreTopic);
    } catch (error) {
      console.error('Error generating AI response:', error);
      return "Sorry, I encountered an error while processing your request.";
    }
  }

  /**
   * Create a summary of the conversation history for context
   */
  private createConversationSummary(conversationHistory: Array<{ role: string; content: string }>): string {
    if (conversationHistory.length === 0) return '';
    
    const recentMessages = conversationHistory.slice(-6); // Last 6 messages
    const topics = new Set<string>();
    
    recentMessages.forEach(msg => {
      if (msg.role === 'user') {
        // Extract potential topics from user messages
        const content = msg.content.toLowerCase();
        if (content.includes('steel')) topics.add('steel products');
        if (content.includes('aluminum')) topics.add('aluminum products');
        if (content.includes('price')) topics.add('pricing');
        if (content.includes('spec')) topics.add('specifications');
        if (content.includes('order')) topics.add('ordering');
      }
    });
    
    const topicList = Array.from(topics).join(', ');
    return topicList ? `Recent topics discussed: ${topicList}` : 'No specific topics identified yet';
  }

  /**
   * Validate and enforce topic focus on the AI response
   */
  private validateAndEnforceTopicFocus(response: string, coreTopic: string): string {
    const responseLower = response.toLowerCase();
    const coreTopicLower = coreTopic.toLowerCase();
    
    // Check if response contains topic-related keywords
    const topicKeywords = [
      'steel', 'aluminum', 'metal', 'product', 'specification', 'price', 'order',
      'industrial', 'fabrication', 'beam', 'pipe', 'sheet', 'alloy', 'grade'
    ];
    
    const hasTopicKeywords = topicKeywords.some(keyword => responseLower.includes(keyword));
    
    // If response doesn't seem topic-focused, add a gentle redirect
    if (!hasTopicKeywords && !responseLower.includes('outside') && !responseLower.includes('discussion')) {
      return `${response}\n\nLet's keep our conversation focused on ${coreTopic}. How else can I help you with our products or services?`;
    }
    
    return response;
  }
  
  /**
   * Generate a promotional message for a product
   * @param productInfo Information about the product to promote
   * @returns A promotional message
   */
  public async generatePromotion(productInfo: string): Promise<string> {
    try {
      const prompt = `Create a short, engaging promotional message for the following product: ${productInfo}. 
      The message should be friendly, highlight key benefits, and include a call to action.`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a marketing specialist." },
          { role: "user", content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.8,
      });
      
      return response.choices[0]?.message.content?.trim() || "Check out our amazing product!";
    } catch (error) {
      console.error('Error generating promotion:', error);
      return "Check out our latest offerings!";
    }
  }
}

// Export a default instance
export default OpenAIService.getInstance();