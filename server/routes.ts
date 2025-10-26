import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { TwilioService } from "./services/twilio.service";
import { MongoDBService } from "./services/mongodb.service";
import { OpenAIService } from "./services/openai.service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize services
  const mongodbService = MongoDBService.getInstance();
  const openaiService = OpenAIService.getInstance();
  
  // Initialize Twilio service (now uses dotenv internally)
  const twilioService = TwilioService.getInstance();

  await twilioService.initialize();

  // Authentication endpoints
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      // Here you'd typically check against a database
      // For now using hardcoded values to match frontend
      if (username === 'crm' && password === '123') {
        // In a real app, you'd generate a JWT token here
        const token = 'dummy-token';
        res.json({ token });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to process login' });
    }
  });

  app.get('/api/auth/session', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      // Here you'd typically validate the JWT token
      // For now just checking if it exists
      if (token === 'dummy-token') {
        res.json({ valid: true });
      } else {
        res.status(401).json({ error: 'Invalid token' });
      }
    } catch (error) {
      console.error('Session validation error:', error);
      res.status(500).json({ error: 'Failed to validate session' });
    }
  });

  // Public chat endpoint (for landing page)
  app.post('/api/chat', async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Get response from knowledge base
      const response = await openaiService.generateFromKnowledgeBase(message);
      res.json({ response });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'Failed to process chat message' });
    }
  });

  // Request OTP endpoint
  app.post('/api/request-otp', async (req, res) => {
    try {
      const { phone, name } = req.body;
      if (!phone || !name) {
        return res.status(400).json({ error: 'Phone and name are required' });
      }

      // Generate a random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store the OTP and user info temporarily (you might want to use Redis in production)
      await mongodbService.storeOTP(phone, otp, name);
      
      // Send OTP via Twilio
      await twilioService.sendMessage(phone, `Your ChatPilot verification code is: ${otp}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('OTP request error:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  });

  // Verify OTP endpoint
  app.post('/api/verify-otp', async (req, res) => {
    try {
      const { phone, name, otp } = req.body;
      if (!phone || !name || !otp) {
        return res.status(400).json({ error: 'Phone, name and OTP are required' });
      }

      // Verify OTP
      const isValid = await mongodbService.verifyOTP(phone, otp);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid OTP' });
      }

      // Store user in GMT_Cust collection
      await mongodbService.createOrUpdateCustomer({
        phone,
        name,
        lastLogin: new Date(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({ error: 'Failed to verify OTP' });
    }
  });

  // Configure multer for file uploads
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'campaigns');
  
  // Ensure upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `campaign-${uniqueSuffix}${ext}`);
    }
  });

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 15 * 1024 * 1024, // 15MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allow images, videos, and documents
      const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|pdf|doc|docx/;
      const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimeType = allowedTypes.test(file.mimetype);
      
      if (mimeType && extName) {
        cb(null, true);
      } else {
        cb(new Error('Only images, videos, and documents are allowed!'));
      }
    }
  });

  // Chat history endpoints
  app.get('/api/chat-history/:phoneNumber', async (req: Request<{phoneNumber: string}>, res: Response) => {
    try {
      const { phoneNumber } = req.params;
      const history = await mongodbService.getChatHistory(phoneNumber);
      res.json(history || { phoneNumber, messages: [], lastInteraction: new Date() });
    } catch (error) {
      console.error('Error fetching chat history:', error);
      res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  });

  app.get('/api/chat-history', async (req: Request<{}, {}, {}, {limit?: string; skip?: string}>, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 20;
      const skip = Number(req.query.skip) || 0;
      const histories = await mongodbService.getRecentChatHistories(limit, skip);
      res.json(histories);
    } catch (error) {
      console.error('Error fetching chat histories:', error);
      res.status(500).json({ error: 'Failed to fetch chat histories' });
    }
  });

  app.put('/api/chat-history/:phoneNumber/metadata', async (req: Request<{phoneNumber: string}, {}, {metadata: Record<string, unknown>}>, res: Response) => {
    try {
      const { phoneNumber } = req.params;
      const { metadata } = req.body;
      await mongodbService.updateChatMetadata(phoneNumber, metadata);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating chat metadata:', error);
      res.status(500).json({ error: 'Failed to update chat metadata' });
    }
  });

  app.get('/api/chat-history/label/:label', async (req: any, res: any) => {
    try {
      const { label } = req.params;
      const histories = await mongodbService.getChatHistoriesByLabel(label);
      res.json(histories);
    } catch (error) {
      console.error('Error fetching labeled chats:', error);
      res.status(500).json({ error: 'Failed to fetch labeled chats' });
    }
  });

  // Twilio webhook endpoints
  app.post('/api/webhook/twilio', async (req: any, res: any) => {
    try {
      const { From: from, Body: message } = req.body;
      
      if (!from || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Extract phone number from WhatsApp format
      const phoneNumber = from.replace('whatsapp:', '');
      
      await twilioService.handleIncomingMessage(phoneNumber, message);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // Send message endpoint
  app.post('/api/send-message', async (req, res) => {
    try {
      const { to, message } = req.body;
      
      if (!to || !message) {
        return res.status(400).json({ error: 'Missing required fields: to, message' });
      }

      const success = await twilioService.sendMessage(to, message);
      
      res.json({ success, message: success ? 'Message sent successfully' : 'Failed to send message' });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Send bulk messages endpoint
  app.post('/api/send-bulk', async (req, res) => {
    try {
      const { phoneNumbers, message } = req.body;
      
      if (!phoneNumbers || !Array.isArray(phoneNumbers) || !message) {
        return res.status(400).json({ error: 'Missing required fields: phoneNumbers (array), message' });
      }

      const result = await twilioService.sendBulkMessage(phoneNumbers, message);
      
      res.json({ 
        success: true, 
        sent: result.success, 
        failed: result.failed,
        total: phoneNumbers.length
      });
    } catch (error) {
      console.error('Send bulk error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get account info endpoint
  app.get('/api/account-info', async (req, res) => {
    try {
      const accountInfo = await twilioService.getAccountInfo();
      res.json(accountInfo);
    } catch (error) {
      console.error('Account info error:', error);
      res.status(500).json({ error: 'Failed to fetch account info' });
    }
  });

  // Send scheduled promotions endpoint
  app.post('/api/send-promotions', async (req, res) => {
    try {
      const { daysInactive = 3 } = req.body;
      await twilioService.sendScheduledPromotions(daysInactive);
      res.json({ success: true, message: 'Promotions sent successfully' });
    } catch (error) {
      console.error('Send promotions error:', error);
      res.status(500).json({ error: 'Failed to send promotions' });
    }
  });

  // Get customers endpoint
  app.get('/api/customers', async (req, res) => {
    try {
      const customers = await mongodbService.getInactiveCustomers(0); // Get all customers
      res.json(customers);
    } catch (error) {
      console.error('Get customers error:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  });

  // Preview chat endpoint for testing chatbot functionality
  app.post('/api/chat/preview', async (req, res) => {
    try {
      const { message, conversationHistory = [], sessionId, systemPrompt } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required and must be a string' });
      }

      // Validate conversation history format
      if (!Array.isArray(conversationHistory)) {
        return res.status(400).json({ error: 'Conversation history must be an array' });
      }

      // Validate each message in conversation history
      for (const msg of conversationHistory) {
        if (!msg.role || !msg.content || !['user', 'assistant'].includes(msg.role)) {
          return res.status(400).json({ 
            error: 'Invalid conversation history format. Each message must have role (user/assistant) and content' 
          });
        }
      }

      // Get relevant knowledge base context
      const knowledgeContext = await mongodbService.getRelevantKnowledge(message);

      // Generate AI response using OpenAI service with enhanced context
      const aiResponse = await openaiService.generateResponse(
        message,
        conversationHistory,
        knowledgeContext,
        systemPrompt // optional guidance from client for prompt engineering
      );

      // Log the interaction for monitoring (without sensitive data)
      console.log(`Preview chat - Session: ${sessionId || 'anonymous'}, Message length: ${message.length}, Response length: ${aiResponse.length}`);

      res.json({ 
        content: aiResponse,
        message: aiResponse, // For backward compatibility
        sessionId: sessionId || `preview_${Date.now()}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Preview chat error:', error);
      res.status(500).json({ 
        error: 'Failed to generate response',
        content: "I'm sorry, I encountered an error. Please try again later.",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get all knowledge base entries (for testing/debugging)
  app.get('/api/knowledge-base', async (req, res) => {
    try {
      const knowledge = await mongodbService.getAllKnowledge();
      res.json(knowledge);
    } catch (error) {
      console.error('Get knowledge base error:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge base' });
    }
  });

  // Add knowledge base entry
  app.post('/api/knowledge-base', async (req, res) => {
    try {
      const { query, content } = req.body;
      
      if (!query || !content) {
        return res.status(400).json({ error: 'Missing required fields: query, content' });
      }

      await mongodbService.addKnowledge(query, content);
      res.json({ success: true, message: 'Knowledge base entry added successfully' });
    } catch (error) {
      console.error('Add knowledge base error:', error);
      res.status(500).json({ error: 'Failed to add knowledge base entry' });
    }
  });

  // Get products endpoint
  app.get('/api/products', async (req, res) => {
    try {
      const products = await mongodbService.getProductsToPromote();
      res.json(products);
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  // Leads endpoints
  app.get('/api/leads', async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
        status,
        engagementMin,
        engagementMax,
        dateStart,
        dateEnd
      } = req.query;

      const filters: any = {};
      
      // Add search filter
      if (search) {
        filters.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Add status filter
      if (status) {
        if (Array.isArray(status)) {
          filters.status = { $in: status };
        } else {
          filters.status = status;
        }
      }
      
      // Add engagement score filter
      if (engagementMin || engagementMax) {
        filters.engagementScore = {};
        if (engagementMin) filters.engagementScore.$gte = Number(engagementMin);
        if (engagementMax) filters.engagementScore.$lte = Number(engagementMax);
      }
      
      // Add date range filter
      if (dateStart || dateEnd) {
        filters.createdAt = {};
        if (dateStart) filters.createdAt.$gte = new Date(dateStart as string);
        if (dateEnd) filters.createdAt.$lte = new Date(dateEnd as string);
      }

      const leads = await mongodbService.getLeads(filters, {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });
      
      res.json(leads);
    } catch (error) {
      console.error('Get leads error:', error);
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  });

  app.get('/api/leads/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const lead = await mongodbService.getLeadById(id);
      
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      res.json(lead);
    } catch (error) {
      console.error('Get lead error:', error);
      res.status(500).json({ error: 'Failed to fetch lead' });
    }
  });

  app.post('/api/leads', async (req, res) => {
    try {
      const leadData = req.body;
      const lead = await mongodbService.createLead(leadData);
      res.status(201).json(lead);
    } catch (error) {
      console.error('Create lead error:', error);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  });

  app.put('/api/leads/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const lead = await mongodbService.updateLead(id, updateData);
      
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      res.json(lead);
    } catch (error) {
      console.error('Update lead error:', error);
      res.status(500).json({ error: 'Failed to update lead' });
    }
  });

  app.delete('/api/leads/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await mongodbService.deleteLead(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete lead error:', error);
      res.status(500).json({ error: 'Failed to delete lead' });
    }
  });

  app.delete('/api/leads', async (req, res) => {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids)) {
        return res.status(400).json({ error: 'ids must be an array' });
      }
      
      const result = await mongodbService.deleteManyLeads(ids);
      res.json({ success: true, deletedCount: result });
    } catch (error) {
      console.error('Bulk delete leads error:', error);
      res.status(500).json({ error: 'Failed to delete leads' });
    }
  });

  app.post('/api/leads/import', async (req, res) => {
    try {
      const { fileData, fileName } = req.body;
      
      if (!fileData || !fileName) {
        return res.status(400).json({ error: 'Missing fileData or fileName' });
      }
      
      const result = await mongodbService.importLeadsFromExcel(fileData, fileName);
      res.json(result);
    } catch (error) {
      console.error('Import leads error:', error);
      res.status(500).json({ error: 'Failed to import leads' });
    }
  });

  // Knowledge Base Articles endpoints
  app.get('/api/knowledge-base/articles', async (req, res) => {
    try {
      const {
        q: search,
        category,
        page = 1,
        limit = 20
      } = req.query;

      const query = {
        search: search as string,
        category: category as string,
        page: Number(page),
        limit: Number(limit)
      };

      const result = await mongodbService.getLegacyArticles(query);
      
      res.json(result);
    } catch (error) {
      console.error('Get articles error:', error);
      res.status(500).json({ error: 'Failed to fetch articles' });
    }
  });

  app.get('/api/knowledge-base/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const article = await mongodbService.getLegacyArticleById(id);
      
      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }
      
      res.json(article);
    } catch (error) {
      console.error('Get article error:', error);
      res.status(500).json({ error: 'Failed to fetch article' });
    }
  });

  app.post('/api/knowledge-base/articles', async (req, res) => {
    try {
      const articleData = req.body;
      const article = await mongodbService.createLegacyArticle(articleData);
      res.status(201).json(article);
    } catch (error) {
      console.error('Create article error:', error);
      res.status(500).json({ error: 'Failed to create article' });
    }
  });

  app.put('/api/knowledge-base/articles/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const article = await mongodbService.updateLegacyArticle(id, updateData);
      
      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }
      
      res.json(article);
    } catch (error) {
      console.error('Update article error:', error);
      res.status(500).json({ error: 'Failed to update article' });
    }
  });

  app.put('/api/knowledge-base/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const article = await mongodbService.updateLegacyArticle(id, updateData);
      
      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }
      
      res.json(article);
    } catch (error) {
      console.error('Update article error:', error);
      res.status(500).json({ error: 'Failed to update article' });
    }
  });

  app.delete('/api/knowledge-base/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await mongodbService.deleteLegacyArticle(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Article not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete article error:', error);
      res.status(500).json({ error: 'Failed to delete article' });
    }
  });

  app.post('/api/knowledge-base/upload', async (req, res) => {
    try {
      // Handle PDF upload - this would need multer middleware
      res.status(501).json({ error: 'PDF upload not implemented yet' });
    } catch (error) {
      console.error('Upload PDF error:', error);
      res.status(500).json({ error: 'Failed to upload PDF' });
    }
  });

  // Campaign endpoints
  app.get('/api/campaigns', async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
        status,
        type,
        createdBy,
        dateStart,
        dateEnd
      } = req.query;

      const filters: any = {};
      
      if (search) {
        filters.$or = [
          { name: { $regex: search, $options: 'i' } },
          { message: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (status) {
        if (Array.isArray(status)) {
          filters.status = { $in: status };
        } else {
          filters.status = status;
        }
      }
      
      if (type) {
        if (Array.isArray(type)) {
          filters.type = { $in: type };
        } else {
          filters.type = type;
        }
      }
      
      if (createdBy) {
        filters.createdBy = createdBy;
      }
      
      if (dateStart || dateEnd) {
        filters.createdAt = {};
        if (dateStart) filters.createdAt.$gte = new Date(dateStart as string);
        if (dateEnd) filters.createdAt.$lte = new Date(dateEnd as string);
      }

      const campaigns = await mongodbService.getCampaigns(filters, {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });
      
      res.json(campaigns);
    } catch (error) {
      console.error('Get campaigns error:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  });

  app.get('/api/campaigns/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await mongodbService.getCampaignById(id);
      
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error('Get campaign error:', error);
      res.status(500).json({ error: 'Failed to fetch campaign' });
    }
  });

  app.post('/api/campaigns', async (req, res) => {
    try {
      const campaignData = req.body;
      const campaign = await mongodbService.createCampaign(campaignData);
      res.status(201).json(campaign);
    } catch (error) {
      console.error('Create campaign error:', error);
      res.status(500).json({ error: 'Failed to create campaign' });
    }
  });

  app.put('/api/campaigns/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const campaign = await mongodbService.updateCampaign(id, updateData);
      
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error('Update campaign error:', error);
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  });

  app.delete('/api/campaigns/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await mongodbService.deleteCampaign(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete campaign error:', error);
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  });

  app.post('/api/campaigns/:id/pause', async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await mongodbService.updateCampaign(id, { status: 'paused' });
      
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error('Pause campaign error:', error);
      res.status(500).json({ error: 'Failed to pause campaign' });
    }
  });

  app.post('/api/campaigns/:id/resume', async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await mongodbService.updateCampaign(id, { status: 'active' });
      
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error('Resume campaign error:', error);
      res.status(500).json({ error: 'Failed to resume campaign' });
    }
  });

  app.post('/api/campaigns/:id/send-now', async (req, res) => {
    try {
      const { id } = req.params;
      // This would trigger immediate campaign execution
      const campaign = await mongodbService.updateCampaign(id, { status: 'sending', sentAt: new Date() });
      
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      // Here you would trigger the actual sending logic
      res.json(campaign);
    } catch (error) {
      console.error('Send campaign error:', error);
      res.status(500).json({ error: 'Failed to send campaign' });
    }
  });

  app.get('/api/campaigns-stats', async (req, res) => {
    try {
      const stats = await mongodbService.getCampaignStats();
      res.json(stats || {
        totalCampaigns: 0,
        activeCampaigns: 0,
        completedCampaigns: 0,
        totalSent: 0
      });
    } catch (error) {
      console.error('Get campaign stats error:', error);
      res.status(500).json({ error: 'Failed to fetch campaign stats' });
    }
  });

  app.post('/api/campaigns/media', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const fileUrl = `/uploads/campaigns/${req.file.filename}`;
      
      res.json({
        url: fileUrl,
        fullUrl: `${baseUrl}${fileUrl}`,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error('Upload media error:', error);
      res.status(500).json({ error: 'Failed to upload media' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
