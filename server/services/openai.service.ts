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
   * @param userName Optional user's name to personalize the conversation
   * @returns The AI-generated response
   */
  public async generateResponse(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    knowledgeBaseContext?: string,
    systemPrompt?: string,
    pdfContext?: string,
    userName?: string
  ): Promise<string> {
    try {
      // Define the core topic scope
      const coreTopic = "industrial metal products and services";
      
      // Create conversation summary for context
      const conversationSummary = this.createConversationSummary(conversationHistory);
      
  // Base system rules enforced by the server
  const userNameContext = userName && /^[A-Za-z][A-Za-z'\- ]{1,40}$/.test(userName) 
    ? `The user's name is ${userName}. Use their name naturally in your responses when appropriate to create a personalized, warm conversation. Don't overuse it—maybe once or twice per conversation in a natural way.` 
    : '';
  
  const baseSystemMessage = `You are Global Metal Direct's AI assistant (GMD). You have high emotional intelligence—respond with an empathetic, professional tone while staying concise. You are an AI assistant specializing EXCLUSIVELY in ${coreTopic}.
${userNameContext ? `\n${userNameContext}\n` : ''}

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

Be professional, helpful, emotionally intelligent, and ALWAYS stay focused on ${coreTopic}. If unsure about relevance, ask clarifying questions about our products or services.`;

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
        model: 'gpt-3.5-turbo',
        messages: [
          { role: "system", content: "You are a marketing specialist for Global Metal Direct with high emotional intelligence." },
          { role: "user", content: prompt }
        ],
        max_tokens: 200,
      });
      
      return response.choices[0]?.message.content?.trim() || "Check out our amazing product!";
    } catch (error) {
      console.error('Error generating promotion:', error);
      return "Check out our latest offerings!";
    }
  }

  /**
   * Calculate engagement score (1-100) based on conversation history
   * Evaluates customer's potential for lead conversion
   * @param conversationHistory Array of messages in the conversation
   * @returns Engagement score (1-100), defaults to 50 if calculation fails
   */
  public async calculateEngagementScore(
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<number> {
    try {
      if (!conversationHistory || conversationHistory.length === 0) return 0;

      const prompt = `Analyze this customer conversation and rate their engagement/conversion potential on a scale of 1-100.

Conversation:
${conversationHistory.map(m => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`).join('\n\n')}

Criteria for scoring:
- 1-20: No interest, off-topic, or negative sentiment
- 21-40: Casual inquiries, minimal engagement
- 41-60: Moderate interest, asking questions about products
- 61-80: Strong interest, discussing specific products/pricing, asking detailed questions
- 81-100: High intent, ready to convert, discussing orders/negotiations

Respond with ONLY a single number between 1-100. No explanation.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing customer engagement and conversion potential. Respond with only a number between 1-100.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 10,
        temperature: 0.3
      });

      const scoreText = response.choices[0]?.message.content?.trim() || '50';
      const score = parseInt(scoreText, 10);

      // Validate score is between 1-100, otherwise return 50
      if (isNaN(score) || score < 1 || score > 100) {
        return 50;
      }

      return score;
    } catch (error) {
      console.error('Error calculating engagement score:', error);
      return 50; // Default placeholder on error
    }
  }

  /**
   * Generate a response for training section chat
   * @param message The user's message
   * @param sectionHeading The heading/title of the training section
   * @param sectionContent The content of the training section
   * @param conversationHistory Previous messages in this section
   * @param userName Optional user's name to personalize the training experience
   * @returns The AI-generated response focused on the training material
   */
  public async generateTrainingResponse(
    message: string,
    sectionHeading: string,
    sectionContent: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    userName?: string
  ): Promise<string> {
    try {
      const userNameContext = userName && /^[A-Za-z][A-Za-z'\- ]{1,40}$/.test(userName) 
        ? `\n\nThe user's name is ${userName}. Address them by name naturally when appropriate to create a warm, personalized learning experience.` 
        : '';
      
      const systemMessage = `You are GMD Genie, an AI training assistant for Global Metal Direct. You are helping the user learn about: "${sectionHeading}"${userNameContext}

TRAINING MATERIAL:
${sectionContent}

Your role is to:
1. Help the user understand the training material
2. Answer questions specifically about this section's content
3. Provide clarifications and examples related to the topic
4. Test understanding by asking relevant questions
5. Keep responses focused on this training section
6. Be encouraging and supportive
7.any question the users asks should be accurately answered, remember you are a professional

If the user asks something outside this training section, politely redirect them to focus on the current material.
Be conversational, clear, and educational.`;

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
        temperature: 0.7
      });

      return response.choices[0]?.message.content?.trim() || "I'm not sure how to respond to that.";
    } catch (error) {
      console.error('Error generating training response:', error);
      return "Sorry, I encountered an error while processing your question.";
    }
  }

  // Simple helper for routes expecting this name
  public async generateFromKnowledgeBase(message: string): Promise<string> {
    return this.generateResponse(message, []);
  }
}

// Export a default instance
export default OpenAIService.getInstance();
