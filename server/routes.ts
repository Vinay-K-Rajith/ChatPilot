import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { TwilioService } from "./services/twilio.service";
import { MongoDBService } from "./services/mongodb.service";
import { OpenAIService } from "./services/openai.service";
import { TwilioContentService } from "./services/twilioContent.service";
import { normalizePhoneE164 } from "../shared/utils/phone";
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
      const { message, user } = req.body as { message?: string; user?: { name?: string; phone?: string } };
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Determine identity: use phone if provided (normalized), otherwise IP
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || 'unknown';
      const phoneNorm = user?.phone && user?.phone.trim().length > 0 ? normalizePhoneE164(user.phone) : undefined;
      const identifier = phoneNorm || ip;

      // Store user message
      await mongodbService.addMessageToChatHistory(identifier, 'user', message, {
        customerName: user?.name,
        phone: phoneNorm,
        ip: phoneNorm ? undefined : ip,
      });

      // Pull recent chat history for context (last 20 messages)
      const chatHistory = await mongodbService.getChatHistory(identifier);
      const conversationHistory = (chatHistory?.messages || []).slice(-20).map(m => ({ role: m.role, content: m.content }));

      // Get relevant knowledge base context for grounding
      const knowledgeContext = await mongodbService.getRelevantKnowledge(message);

      // Generate response with history and knowledge context
      const response = await openaiService.generateResponse(message, conversationHistory as any, knowledgeContext);

      // Store assistant response
      await mongodbService.addMessageToChatHistory(identifier, 'assistant', response, {
        customerName: user?.name,
        phone: user?.phone,
        ip: user?.phone ? undefined : ip,
      });

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

      const e164 = normalizePhoneE164(phone, process.env.DEFAULT_COUNTRY_CODE);

      // Generate a random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store the OTP and user info temporarily (you might want to use Redis in production)
      await mongodbService.storeOTP(e164, otp, name);
      
      // Send OTP via SMS using Twilio
      const sent = await twilioService.sendSms(e164, `Your ChatPilot verification code is: ${otp}`);
      if (!sent) {
        return res.status(502).json({ error: 'Failed to send OTP via SMS' });
      }
      
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

      const e164 = normalizePhoneE164(phone, process.env.DEFAULT_COUNTRY_CODE);

      // Verify OTP
      const isValid = await mongodbService.verifyOTP(e164, otp);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid OTP' });
      }

      // Store user in GMT_Cust collection
      await mongodbService.createOrUpdateCustomer({
        phone: e164,
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

  // AI usage analytics
  app.get('/api/ai/usage', async (req, res) => {
    try {
      const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };
      const { OpenAIUsageService } = await import('./services/openaiUsage.service');
      const svc = OpenAIUsageService.getInstance();
      const result = await svc.getUsage({ start_date, end_date });
      if (!result.success) return res.status(502).json(result);
      res.json(result);
    } catch (error) {
      console.error('AI usage endpoint error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch AI usage' });
    }
  });

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // WhatsApp Template submission via Twilio Content API
  app.post('/api/whatsapp/templates/submit', async (req: Request, res: Response) => {
    try {
      const svc = TwilioContentService.getInstance();
      const { language, friendly_name, types, variables, name, category } = req.body || {};
      if (!language || !types || !name || !category) {
        return res.status(400).json({ success: false, error: 'Missing required fields: language, types, name, category' });
      }

      // Extract body and media from types
      const body = types['twilio/text']?.body || types['twilio/media']?.body || '';
      const mediaUrl = types['twilio/media']?.media?.[0];

      // 1) Create Content resource
      const created = await svc.createContent({ language, friendly_name, types, variables });
      if (!created.success) return res.status(502).json(created);

      // 2) Submit for WhatsApp approval
      const approval = await svc.submitForApproval(created.contentSid!, { name, category });
      if (!approval.success) return res.status(502).json(approval);

      // 3) Save to MongoDB (metadata only, status will be fetched from Twilio)
      try {
        await mongodbService.saveWhatsAppTemplate({
          contentSid: created.contentSid!,
          approvalSid: approval.approvalSid,
          name,
          friendlyName: friendly_name,
          language,
          category,
          body,
          mediaUrl,
          variables
        });
      } catch (dbError) {
        console.error('Failed to save template to DB:', dbError);
        // Don't fail the request if DB save fails
      }

      return res.json({ success: true, provider: 'twilio', contentSid: created.contentSid, approvalSid: approval.approvalSid, status: approval.status });
    } catch (error) {
      console.error('Template submit error:', error);
      res.status(500).json({ success: false, error: 'Failed to submit template' });
    }
  });

  // Get Content/Approval status (low-latency endpoint)
  app.get('/api/whatsapp/templates/:sid/status', async (req: Request<{sid: string}>, res: Response) => {
    try {
      const svc = TwilioContentService.getInstance();
      const { sid } = req.params;
      
      // Fetch live status from Twilio
      const status = await svc.getStatus(sid);
      if (!status.success) return res.status(502).json(status);
      
      // Update DB with latest status (async, non-blocking)
      setImmediate(async () => {
        try {
          const dbTemplate = await mongodbService.getWhatsAppTemplateByContentSid(sid);
          if (dbTemplate && dbTemplate._id) {
            const templateId = typeof dbTemplate._id === 'string' ? dbTemplate._id : (dbTemplate._id as unknown as string);
            await mongodbService.updateWhatsAppTemplate(templateId, { status: status.status || 'unknown' });
          }
        } catch (err) {
          console.error('Failed to update template status in DB:', err);
        }
      });
      
      res.json({ success: true, status: status.status, raw: status.raw });
    } catch (error) {
      console.error('Get template status error:', error);
      res.status(500).json({ success: false, error: 'Failed to get status' });
    }
  });

  // Sync all template statuses with Twilio (on-demand)
  app.post('/api/whatsapp/templates/sync-status', async (req: Request, res: Response) => {
    try {
      const svc = TwilioContentService.getInstance();
      const templates = await mongodbService.getWhatsAppTemplates();
      
      const results = await Promise.allSettled(
        templates.map(async (t) => {
          const statusRes = await svc.getStatus(t.contentSid);
          if (statusRes.success && t._id) {
            const templateId = typeof t._id === 'string' ? t._id : (t._id as unknown as string);
            await mongodbService.updateWhatsAppTemplate(templateId, { status: statusRes.status || 'unknown' });
          }
          return { contentSid: t.contentSid, status: statusRes.status || 'unknown' };
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      res.json({ success: true, synced: successful, total: templates.length });
    } catch (error) {
      console.error('Sync template status error:', error);
      res.status(500).json({ success: false, error: 'Failed to sync statuses' });
    }
  });

  // Get full template details (DB metadata + Twilio Content object + live status)
  app.get('/api/whatsapp/templates/:sid', async (req: Request<{sid: string}>, res: Response) => {
    try {
      const contentSid = req.params.sid;
      const svc = TwilioContentService.getInstance();
      const [dbTemplate, statusRes, contentRes] = await Promise.all([
        mongodbService.getWhatsAppTemplateByContentSid(contentSid),
        svc.getStatus(contentSid),
        svc.getContent(contentSid)
      ]);

      if (!dbTemplate && !contentRes.success) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      res.json({
        success: true,
        template: dbTemplate,
        status: statusRes.success ? statusRes.status : 'unknown',
        content: contentRes.success ? contentRes.content : undefined,
      });
    } catch (error) {
      console.error('Get template details error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch template details' });
    }
  });

  // List all WhatsApp templates with live status from Twilio
  app.get('/api/whatsapp/templates', async (req: Request<{}, {}, {}, {limit?: string}>, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
      const templates = await mongodbService.getWhatsAppTemplates(limit);
      
      // Check if Twilio credentials are configured
      const svc = TwilioContentService.getInstance();
      const hasCredentials = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
      
      // Fetch live status from Twilio for each template (with fallback)
      const templatesWithStatus = await Promise.all(
        templates.map(async (template) => {
          try {
            let finalStatus = template.status || 'unknown';
            
            // Try to fetch from Twilio if credentials are available
            if (hasCredentials) {
              const statusResult = await svc.getStatus(template.contentSid);
              if (statusResult.success && statusResult.status) {
                finalStatus = statusResult.status;
              }
            }
            
            return { ...template, status: finalStatus };
          } catch (error) {
            // Fallback to stored status
            return { ...template, status: template.status || 'unknown' };
          }
        })
      );
      
      res.json({ success: true, templates: templatesWithStatus });
    } catch (error) {
      console.error('Get templates error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch templates' });
    }
  });

  // Send message endpoint (generic)
  app.post('/api/send-message', async (req, res) => {
    try {
      const { to, message } = req.body;
      if (!to || !message) return res.status(400).json({ error: 'Missing required fields: to, message' });
      const success = await twilioService.sendMessage(to, message);
      if (success) {
        try {
          await mongodbService.addMessageToChatHistory(to.replace(/^whatsapp:/, ''), 'assistant', message, { phone: to.replace(/^whatsapp:/, ''), channel: 'whatsapp', labels: ['whatsapp'] });
        } catch (e) { console.warn('Failed to record outbound message:', e); }
      }
      res.json({ success, message: success ? 'Message sent successfully' : 'Failed to send message' });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Send conversation message within 24h user-initiated session
  app.post('/api/conversations/:phone/send', async (req: Request<{phone: string}, {}, { message?: string }>, res: Response) => {
    try {
      const phone = req.params.phone;
      const { message } = req.body || {};
      if (!phone || !message || !message.trim()) {
        return res.status(400).json({ success: false, error: 'Missing phone or message' });
      }

      // Enforce 24h window from last inbound user message
      const history = await mongodbService.getChatHistory(phone);
      const lastInbound = (history?.messages || []).slice().reverse().find(m => (m as any).role === 'user');
      const within24h = lastInbound ? (Date.now() - new Date((lastInbound as any).timestamp).getTime()) <= 24*60*60*1000 : false;
      if (!within24h) {
        return res.status(403).json({ success: false, error: 'Cannot send session message: last user message >24h ago. Use a WhatsApp approved template.' });
      }

      const ok = await twilioService.sendMessage(phone, message.trim());
      if (!ok) return res.status(502).json({ success: false, error: 'Failed to send via Twilio' });

      // Ensure lead exists and record outbound in chat history
      try { await mongodbService.upsertLeadByPhone(phone, {}); } catch {}
      await mongodbService.addMessageToChatHistory(phone, 'assistant', message.trim(), { phone, channel: 'whatsapp', labels: ['whatsapp'] });
      return res.json({ success: true });
    } catch (error) {
      console.error('Conversation send error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
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

      const leadsResult = await mongodbService.getLeads(filters, {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });
      
      // Calculate engagement scores for leads without scores and with chat history
      const leadsToUpdate = leadsResult.leads.filter(lead => 
        lead.engagementScore === 0 && lead.phone
      );
      
      if (leadsToUpdate.length > 0) {
        // Process in background to not slow down the response
        setImmediate(async () => {
          for (const lead of leadsToUpdate) {
            try {
              const chatHistory = await mongodbService.getChatHistory(lead.phone);
              if (chatHistory && chatHistory.messages && chatHistory.messages.length > 0) {
                const messages = (chatHistory.messages || []).map(m => ({
                  role: m.role,
                  content: m.content
                }));
                const score = await openaiService.calculateEngagementScore(messages);
                await mongodbService.updateLeadEngagementScore(lead.phone, score);
                console.log(`Updated engagement score for ${lead.phone}: ${score}`);
              }
            } catch (error) {
              console.error(`Failed to calculate engagement for ${lead.phone}:`, error);
            }
          }
        });
      }
      
      res.json(leadsResult);
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
      const leadData = req.body || {};
      const phone = normalizePhoneE164(leadData.phone || '', process.env.DEFAULT_COUNTRY_CODE);
      if (!phone) return res.status(400).json({ error: 'Phone is required' });
      await mongodbService.upsertLeadByPhone(phone, { ...leadData, phone });
      const lead = await mongodbService.getLeadByPhone(phone);
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

  // Calculate and update engagement score for a lead based on chat history
  app.post('/api/leads/:phone/calculate-engagement', async (req, res) => {
    try {
      const { phone } = req.params;
      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
      }

      // Get chat history for the phone number
      const chatHistory = await mongodbService.getChatHistory(phone);
      if (!chatHistory || !chatHistory.messages || chatHistory.messages.length === 0) {
        return res.status(400).json({ error: 'No chat history found for this phone' });
      }

      // Calculate engagement score using OpenAI
      const messages = (chatHistory.messages || []).map(m => ({
        role: m.role,
        content: m.content
      }));
      const engagementScore = await openaiService.calculateEngagementScore(messages);

      // Update lead with new engagement score
      await mongodbService.updateLeadEngagementScore(phone, engagementScore);

      res.json({ success: true, phone, engagementScore });
    } catch (error) {
      console.error('Calculate engagement score error:', error);
      res.status(500).json({ error: 'Failed to calculate engagement score' });
    }
  });

  // Debug endpoint to test Twilio connectivity
  app.get('/api/debug/twilio-status', async (req, res) => {
    try {
      const hasAccountSid = !!(process.env.TWILIO_ACCOUNT_SID);
      const hasAuthToken = !!(process.env.TWILIO_AUTH_TOKEN);
      
      if (!hasAccountSid || !hasAuthToken) {
        return res.json({
          success: false,
          error: 'Twilio credentials not configured',
          credentials: {
            accountSid: hasAccountSid ? 'SET' : 'MISSING',
            authToken: hasAuthToken ? 'SET' : 'MISSING'
          }
        });
      }
      
      // Test basic connectivity
      const svc = TwilioContentService.getInstance();
      const testResult = await fetch('https://content.twilio.com/v1/Content?PageSize=1', {
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/json',
        }
      });
      
      const isConnected = testResult.ok;
      
      res.json({
        success: isConnected,
        credentials: {
          accountSid: 'SET',
          authToken: 'SET'
        },
        connectivity: {
          status: isConnected ? 'Connected' : 'Failed',
          httpStatus: testResult.status,
          statusText: testResult.statusText
        }
      });
    } catch (error) {
      console.error('Twilio connectivity test failed:', error);
      res.json({
        success: false,
        error: 'Connection test failed',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Calculate engagement scores for all leads with chat history
  app.post('/api/leads/calculate-all-engagement', async (req, res) => {
    try {
      const allLeads = await mongodbService.getLeads({}, { limit: 1000 });
      const results = { updated: 0, skipped: 0, errors: 0 };
      
      for (const lead of allLeads.leads) {
        try {
          if (!lead.phone) {
            results.skipped++;
            continue;
          }
          
          const chatHistory = await mongodbService.getChatHistory(lead.phone);
          if (!chatHistory?.messages?.length) {
            results.skipped++;
            continue;
          }
          
          const messages = chatHistory.messages.map(m => ({
            role: m.role,
            content: m.content
          }));
          
          const score = await openaiService.calculateEngagementScore(messages);
          await mongodbService.updateLeadEngagementScore(lead.phone, score);
          results.updated++;
          
          console.log(`Updated engagement score for ${lead.phone}: ${score}`);
        } catch (error) {
          console.error(`Error updating ${lead.phone}:`, error);
          results.errors++;
        }
      }
      
      res.json({ success: true, results });
    } catch (error) {
      console.error('Bulk calculate engagement error:', error);
      res.status(500).json({ error: 'Failed to calculate engagement scores' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
