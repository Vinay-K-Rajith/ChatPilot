import { MongoClient, Collection, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import type { ChatHistory } from '../interfaces/chat.interface';
import type { Lead, LeadFilters, PaginationOptions } from '../../shared/models/lead';
import type { 
  KnowledgeQuery, 
  CreateArticleData, 
  UpdateArticleData,
  LegacyArticle,
  CreateLegacyArticleData,
  UpdateLegacyArticleData,
  DatabaseLegacyArticle
} from '../../shared/knowledge';
import { databaseToLegacyArticle } from '../../shared/knowledge';
import type {
  ServerCampaign,
  Campaign,
  CreateCampaignData,
  UpdateCampaignData,
  CampaignFilters,
  CampaignPagination,
  CampaignStats
} from '../../shared/models/campaign';

dotenv.config();

// Types for MongoDB service
export interface WhatsAppTemplate {
  _id?: ObjectId;
  contentSid: string;
  approvalSid?: string;
  name: string;
  friendlyName?: string;
  language: string;
  category: string;
  body: string;
  mediaUrl?: string;
  variables?: Record<string, string>;
  createdAt: Date;
}

type MongoDBCollections = {
  customers?: Collection<Customer>;
  products?: Collection<Product>;
  legacyArticles?: Collection<ServerLegacyArticle>;
  legacyKnowledgeBase?: Collection<LegacyKnowledgeBase>;
  leads?: Collection<ServerLead>;
  campaigns?: Collection<ServerCampaign>;
  chatHistory?: Collection<ChatHistory>;
  gmt_cust?: Collection<GMTCustomer>;
  gmt_otp?: Collection<OTPRecord>;
  whatsappTemplates?: Collection<WhatsAppTemplate>;
};

// Define interfaces for our data models
export interface Customer {
  phone: string;
  lastContact: Date;
  conversationHistory: Array<{
    role: string;
    content: string;
  }>;
}

export interface GMTCustomer {
  _id?: ObjectId;
  name: string;
  phone: string;
  lastLogin: Date;
  createdAt?: Date;
}

export interface OTPRecord {
  _id?: ObjectId;
  phone: string;
  otp: string;
  name: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface Product {
  name: string;
  description: string;
  price: number;
}

// Legacy interface for backward compatibility
export interface LegacyKnowledgeBase {
  query: string;
  content: string;
}

// Server-side Lead type with proper ObjectId
export interface ServerLead extends Omit<Lead, '_id'> {
  _id?: ObjectId;
}

// Interface for legacy articles (GMT_KB) - compatible with existing database
export interface ServerLegacyArticle {
  _id?: ObjectId;
  title?: string;  // Old structure (existing data)
  query?: string;  // New structure
  content: string;
  category?: string;
}

/**
 * MongoDB Service - Singleton implementation for MongoDB database operations
 */
export class MongoDBService {
  private static instance: MongoDBService | null = null;
  private client: MongoClient;
  private dbName: string;
  private collections: MongoDBCollections = {};
  private isConnected = false;

  private constructor() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    this.dbName = process.env.MONGODB_DB_NAME || 'test';
    this.client = new MongoClient(uri);
  }

  public static getInstance(): MongoDBService {
    if (!MongoDBService.instance) {
      MongoDBService.instance = new MongoDBService();
    }
    return MongoDBService.instance;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.client) {
      throw new Error('MongoDB client is not initialized');
    }
    if (this.isConnected) return;

    try {
      await this.client.connect();
      const db = this.client.db(this.dbName);
      
      // Initialize collections
      this.collections = {
        customers: db.collection<Customer>('GMT_KB_customers'),
        products: db.collection<Product>('GMT_KB_products'),
        legacyArticles: db.collection<ServerLegacyArticle>('GMT_KB'),
        legacyKnowledgeBase: db.collection<LegacyKnowledgeBase>('GMT_KB'),
        chatHistory: db.collection<ChatHistory>('GMT_CH'),
        leads: db.collection<ServerLead>('GMT_Leads'),
        campaigns: db.collection<ServerCampaign>('Campaigns'),
        gmt_cust: db.collection<GMTCustomer>('GMT_Cust'),
        gmt_otp: db.collection<OTPRecord>('GMT_OTP'),
        whatsappTemplates: db.collection<WhatsAppTemplate>('WhatsApp_Templates')
      };

      // Create indexes for chat history
      await this.collections.chatHistory?.createIndex({ phoneNumber: 1 });
      await this.collections.chatHistory?.createIndex({ lastInteraction: 1 });
      await this.collections.chatHistory?.createIndex({ "metadata.labels": 1 });

      // Create indexes for legacy articles (GMT_KB)
      await this.collections.legacyArticles?.createIndex({ query: 1 });
      await this.collections.legacyArticles?.createIndex({ category: 1 });
      await this.collections.legacyArticles?.createIndex({
        query: "text", 
        content: "text", 
        category: "text" 
      }, { name: "articles_text_search" });

      // Create indexes for leads
      await this.collections.leads?.createIndex({ phone: 1 }, { unique: true });
      await this.collections.leads?.createIndex({ email: 1 });
      await this.collections.leads?.createIndex({ status: 1 });
      await this.collections.leads?.createIndex({ engagementScore: 1 });
      await this.collections.leads?.createIndex({ lastContactedAt: 1 });
      await this.collections.leads?.createIndex({ createdAt: 1 });

      // Create indexes for campaigns
      await this.collections.campaigns?.createIndex({ status: 1 });
      await this.collections.campaigns?.createIndex({ type: 1 });
      await this.collections.campaigns?.createIndex({ createdBy: 1 });
      await this.collections.campaigns?.createIndex({ scheduledAt: 1 });
      await this.collections.campaigns?.createIndex({ createdAt: 1 });
      try {
        await this.collections.campaigns?.createIndex({ name: "text", template: "text" }, { name: "campaigns_text_search" });
      } catch (error: any) {
        if (error && (error.code === 85 || error.codeName === 'IndexOptionsConflict')) {
          // If index exists with different options, drop and recreate with our options
          await this.collections.campaigns?.dropIndex("campaigns_text_search");
          await this.collections.campaigns?.createIndex({ name: "text", template: "text" }, { name: "campaigns_text_search" });
        } else {
          throw error;
        }
      }

      // Create indexes for GMT_Cust
      await this.collections.gmt_cust?.createIndex({ phone: 1 }, { unique: true });
      await this.collections.gmt_cust?.createIndex({ lastLogin: 1 });
      await this.collections.gmt_cust?.createIndex({ createdAt: 1 });

      // Create indexes for GMT_OTP
      await this.collections.gmt_otp?.createIndex({ phone: 1 });
      await this.collections.gmt_otp?.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

      // Create indexes for WhatsApp Templates
      await this.collections.whatsappTemplates?.createIndex({ contentSid: 1 }, { unique: true });
      await this.collections.whatsappTemplates?.createIndex({ createdAt: -1 });

      this.isConnected = true;
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async connect(): Promise<this> {
    await this.ensureConnected();
    return this;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
    }
  }

  // Chat History Methods
  public async getChatHistory(phoneOrIp: string): Promise<ChatHistory | null> {
    await this.ensureConnected();
    if (!this.collections.chatHistory) {
      throw new Error('ChatHistory collection is not initialized');
    }
    const history = await this.collections.chatHistory.findOne({ phoneNumber: phoneOrIp } as any);
    return history as any;
  }
  
  public async storeChatMessage(chat: Omit<ChatHistory, 'createdAt'>): Promise<void> {
    await this.ensureConnected();
    if (!this.collections.chatHistory) {
      throw new Error('ChatHistory collection is not initialized');
    }
    await this.collections.chatHistory.insertOne({
      ...chat,
      lastInteraction: new Date()
    });
  }

  // OTP Methods
  public async storeOTP(phone: string, otp: string, name: string): Promise<void> {
    await this.ensureConnected();
    if (!this.collections.gmt_otp) {
      throw new Error('GMT_OTP collection is not initialized');
    }
    await this.collections.gmt_otp.insertOne({
      phone,
      otp,
      name,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // OTP expires in 10 minutes
    });
  }

  public async verifyOTP(phone: string, otp: string): Promise<boolean> {
    await this.ensureConnected();
    if (!this.collections.gmt_otp) {
      throw new Error('GMT_OTP collection is not initialized');
    }
    const record = await this.collections.gmt_otp.findOne({
      phone,
      otp,
      expiresAt: { $gt: new Date() }
    });

    if (record) {
      await this.collections.gmt_otp.deleteOne({ _id: record._id });
      return true;
    }
    return false;
  }

  // Customer Methods
  public async createOrUpdateCustomer(customer: Omit<GMTCustomer, '_id' | 'createdAt'>): Promise<void> {
    await this.ensureConnected();
    if (!this.collections.gmt_cust) {
      throw new Error('GMT_Cust collection is not initialized');
    }
    const now = new Date();
    await this.collections.gmt_cust.updateOne(
      { phone: customer.phone },
      { 
        $set: { 
          ...customer,
          lastLogin: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true }
    );
  }

  public async getCustomerByPhone(phone: string): Promise<GMTCustomer | null> {
    await this.ensureConnected();
    if (!this.collections.gmt_cust) {
      throw new Error('GMT_Cust collection is not initialized');
    }
    return this.collections.gmt_cust.findOne({ phone });
  }
  
  // Legacy Knowledge Base Methods
  public async getRelevantKnowledge(query: string): Promise<string> {
    await this.ensureConnected();
    if (!this.collections.legacyArticles) {
      throw new Error('Legacy articles collection is not initialized');
    }
    
    if (!query || query.trim().length === 0) return '';

    try {
      // Search articles using text search
      const articleResults = await this.collections.legacyArticles.find({
        $text: { $search: query }
      }).sort({ score: { $meta: "textScore" } }).limit(10).toArray();

      // If text search doesn't work, fallback to regex search
      let results = articleResults;
      if (results.length === 0) {
        const words = query.toLowerCase().split(/\W+/).filter(word => word.length > 3);
        if (words.length > 0) {
          const regexPatterns = words.map(word => new RegExp(word, 'i'));
          results = await this.collections.legacyArticles.find({
            $or: [
              ...regexPatterns.map(pattern => ({ title: pattern })),
              ...regexPatterns.map(pattern => ({ content: pattern }))
            ]
          }).limit(5).toArray();
        }
      }
      
      return results.map(item => item.content).join('\n\n');
    } catch (error) {
      console.error('Error in getRelevantKnowledge:', error);
      return '';
    }
  }

  // ============== Chat History Methods (extended) ==============
  public async addMessageToChatHistory(phoneNumberOrIp: string, role: 'user' | 'assistant', content: string, opts?: { customerName?: string; phone?: string; ip?: string; channel?: string; labels?: string[] }): Promise<void> {
    await this.ensureConnected();
    if (!this.collections.chatHistory) throw new Error('ChatHistory collection is not initialized');
    const message = { role, content, timestamp: new Date() } as any;
    const setOps: any = { lastInteraction: new Date() };
    if (opts?.customerName) setOps['metadata.customerName'] = opts.customerName;
    if (opts?.phone) setOps['metadata.phone'] = opts.phone;
    if (opts?.ip) setOps['metadata.ip'] = opts.ip;
    if (opts?.channel) setOps['metadata.channel'] = opts.channel;

    const addToSetOps: any = {};
    if (opts?.labels && opts.labels.length > 0) {
      addToSetOps['metadata.labels'] = { $each: Array.from(new Set(opts.labels)) } as any;
    }

    await this.collections.chatHistory.updateOne(
      { phoneNumber: phoneNumberOrIp } as any,
      {
        $push: { messages: message },
        ...(Object.keys(addToSetOps).length ? { $addToSet: addToSetOps } : {}),
        $set: setOps,
        $setOnInsert: { phoneNumber: phoneNumberOrIp }
      },
      { upsert: true }
    );
  }

  public async getRecentChatHistories(limit: number = 20, skip: number = 0): Promise<ChatHistory[]> {
    await this.ensureConnected();
    if (!this.collections.chatHistory) throw new Error('ChatHistory collection is not initialized');
    return this.collections.chatHistory
      .find()
      .sort({ lastInteraction: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  public async updateChatMetadata(phoneNumber: string, metadata: Record<string, unknown>): Promise<void> {
    await this.ensureConnected();
    if (!this.collections.chatHistory) throw new Error('ChatHistory collection is not initialized');
    await this.collections.chatHistory.updateOne(
      { phoneNumber },
      { $set: { metadata } }
    );
  }

  public async getChatHistoriesByLabel(label: string): Promise<ChatHistory[]> {
    await this.ensureConnected();
    if (!this.collections.chatHistory) throw new Error('ChatHistory collection is not initialized');
    return this.collections.chatHistory
      .find({ "metadata.labels": label } as any)
      .sort({ lastInteraction: -1 })
      .toArray();
  }

  // ============== Products & Customers Helpers ==============
  public async getProductsToPromote(): Promise<Product[]> {
    await this.ensureConnected();
    if (!this.collections.products) throw new Error('Products collection is not initialized');
    return this.collections.products.find().toArray();
  }

  public async getInactiveCustomers(days: number): Promise<Customer[]> {
    await this.ensureConnected();
    if (!this.collections.customers) throw new Error('Customers collection is not initialized');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return this.collections.customers.find({ lastContact: { $lt: cutoffDate } } as any).toArray();
  }

  public async updateLastContact(phone: string): Promise<void> {
    await this.ensureConnected();
    if (!this.collections.customers) throw new Error('Customers collection is not initialized');
    await this.collections.customers.updateOne(
      { phone },
      { $set: { lastContact: new Date() } }
    );
  }

  // ============== Leads Methods ==============
  /** Check if a lead exists by phone */
  public async leadExists(phone: string): Promise<boolean> {
    await this.ensureConnected();
    if (!this.collections.leads) throw new Error('Leads collection is not initialized');
    const found = await this.collections.leads.findOne({ phone } as any, { projection: { _id: 1 } } as any);
    return !!found;
  }

  /** Get a lead by phone */
  public async getLeadByPhone(phone: string): Promise<any | null> {
    await this.ensureConnected();
    if (!this.collections.leads) throw new Error('Leads collection is not initialized');
    const lead = await this.collections.leads.findOne({ phone } as any);
    return lead ? { ...(lead as any), _id: (lead as any)._id?.toString() } : null;
  }

  /** Create or update a lead by phone with provided fields */
  public async upsertLeadByPhone(phone: string, updates: Record<string, any>): Promise<void> {
    await this.ensureConnected();
    if (!this.collections.leads) throw new Error('Leads collection is not initialized');
    const now = new Date();
    await this.collections.leads.updateOne(
      { phone } as any,
      {
        $set: { phone, ...updates, updatedAt: now },
        $setOnInsert: { createdAt: now, status: (updates as any).status || 'new', source: (updates as any).source || 'whatsapp' }
      },
      { upsert: true }
    );
  }

  /** Convenience: set name for a lead by phone (upsert) */
  public async upsertLeadNameByPhone(phone: string, name: string): Promise<void> {
    await this.upsertLeadByPhone(phone, { name });
  }

  public async getLeads(filters: LeadFilters = {}, pagination: PaginationOptions = {}): Promise<{
    leads: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    await this.ensureConnected();
    if (!this.collections.leads) throw new Error('Leads collection is not initialized');

    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query.status = { $in: filters.status };
      } else {
        query.status = filters.status;
      }
    }

    if ((filters as any).engagementScore) {
      query.engagementScore = {};
      const es: any = (filters as any).engagementScore;
      if (es.min !== undefined) query.engagementScore.$gte = es.min;
      if (es.max !== undefined) query.engagementScore.$lte = es.max;
    }

    if ((filters as any).search) {
      query.$or = [
        { name: { $regex: (filters as any).search, $options: 'i' } },
        { phone: { $regex: (filters as any).search, $options: 'i' } },
        { email: { $regex: (filters as any).search, $options: 'i' } },
      ];
    }

    if ((filters as any).dateRange) {
      query.createdAt = {};
      const dr: any = (filters as any).dateRange;
      if (dr.start) query.createdAt.$gte = dr.start;
      if (dr.end) query.createdAt.$lte = dr.end;
    }

    const [leads, total] = await Promise.all([
      this.collections.leads
        .find(query)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collections.leads.countDocuments(query)
    ]);

    const leadsWithStringIds = leads.map(lead => ({ ...lead, _id: (lead as any)._id?.toString() }));

    return {
      leads: leadsWithStringIds,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  public async getLeadById(id: string): Promise<any | null> {
    await this.ensureConnected();
    if (!this.collections.leads) throw new Error('Leads collection is not initialized');
    const lead = await this.collections.leads.findOne({ _id: new ObjectId(id) } as any);
    if (!lead) return null;
    return { ...lead, _id: (lead as any)._id?.toString() } as any;
  }

  public async createLead(leadData: Omit<Lead, '_id' | 'createdAt' | 'updatedAt'>): Promise<any> {
    await this.ensureConnected();
    if (!this.collections.leads) throw new Error('Leads collection is not initialized');
    const now = new Date();
    const lead = { ...(leadData as any), createdAt: now, updatedAt: now } as ServerLead;
    const result = await this.collections.leads.insertOne(lead);
    return { ...(lead as any), _id: result.insertedId.toString() } as any;
  }

  public async updateLead(id: string, updates: Partial<Omit<Lead, '_id'>>): Promise<any | null> {
    await this.ensureConnected();
    if (!this.collections.leads) throw new Error('Leads collection is not initialized');
    const updateData = { ...(updates as any), updatedAt: new Date() };
    const result: any = await this.collections.leads.findOneAndUpdate(
      { _id: new ObjectId(id) } as any,
      { $set: updateData },
      { returnDocument: 'after' as any }
    );
    if (!result || !result.value) return null;
    const doc = result.value;
    return { ...doc, _id: doc._id?.toString() } as any;
  }

  public async deleteLead(id: string): Promise<boolean> {
    await this.ensureConnected();
    if (!this.collections.leads) throw new Error('Leads collection is not initialized');
    const result = await this.collections.leads.deleteOne({ _id: new ObjectId(id) } as any);
    return result.deletedCount === 1;
  }

  public async deleteManyLeads(ids: string[]): Promise<number> {
    await this.ensureConnected();
    if (!this.collections.leads) throw new Error('Leads collection is not initialized');
    const objectIds = ids.map(id => new ObjectId(id));
    const result = await this.collections.leads.deleteMany({ _id: { $in: objectIds } } as any);
    return result.deletedCount ?? 0;
  }

  public async importLeads(leadsData: Array<Omit<ServerLead, '_id' | 'createdAt' | 'updatedAt'>>): Promise<{
    success: number; failed: number; errors: Array<{ data: any; error: string }>
  }> {
    await this.ensureConnected();
    if (!this.collections.leads) throw new Error('Leads collection is not initialized');
    const now = new Date();
    const results = { success: 0, failed: 0, errors: [] as Array<{ data: any; error: string }> };
    for (const leadData of leadsData) {
      try {
        const lead = { ...(leadData as any), createdAt: now, updatedAt: now } as ServerLead;
        await this.collections.leads.insertOne(lead);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({ data: leadData, error: error?.message || 'Unknown error' });
      }
    }
    return results;
  }

  public async importLeadsFromExcel(fileData: string, _fileName: string): Promise<{ success: number; failed: number; errors: Array<{ data: any; error: string }> }> {
    // Minimal implementation: expect base64-encoded JSON array of leads
    try {
      const base64 = fileData.includes(',') ? fileData.split(',')[1] : fileData;
      const decoded = Buffer.from(base64, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed)) {
        return await this.importLeads(parsed);
      }
      return { success: 0, failed: 1, errors: [{ data: null, error: 'Parsed content is not an array' }] };
    } catch (e: any) {
      return { success: 0, failed: 1, errors: [{ data: null, error: e?.message || 'Failed to parse fileData' }] };
    }
  }

  // ============== Knowledge Base (Legacy Articles) ==============
  public async addKnowledge(query: string, content: string): Promise<void> {
    await this.ensureConnected();
    if (!this.collections.legacyKnowledgeBase) throw new Error('Legacy KB collection is not initialized');
    await this.collections.legacyKnowledgeBase.insertOne({ query, content } as any);
  }

  public async getAllKnowledge(): Promise<LegacyKnowledgeBase[]> {
    await this.ensureConnected();
    if (!this.collections.legacyKnowledgeBase) throw new Error('Legacy KB collection is not initialized');
    return this.collections.legacyKnowledgeBase.find().toArray();
  }

  public async createLegacyArticle(articleData: CreateLegacyArticleData): Promise<any> {
    await this.ensureConnected();
    if (!this.collections.legacyArticles) throw new Error('Legacy articles collection is not initialized');
    const article = { title: (articleData as any).title, content: (articleData as any).content, category: (articleData as any).category } as ServerLegacyArticle;
    const result = await this.collections.legacyArticles.insertOne(article);
    return { ...article, _id: result.insertedId.toString(), type: 'article', uploadedAt: new Date() } as any;
  }

  public async getLegacyArticles(query: { search?: string; category?: string; page?: number; limit?: number }): Promise<{ articles: any[]; total: number; page: number; limit: number; totalPages: number; }> {
    await this.ensureConnected();
    if (!this.collections.legacyArticles) throw new Error('Legacy articles collection is not initialized');
    const { page = 1, limit = 20, search, category } = query || {} as any;
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (category) filter.category = category;

    let articles: any[] = [];
    let total = 0;

    if (search && search.trim().length > 0) {
      const searchFilter = { ...filter, $text: { $search: search } };
      const [searchResults, searchTotal] = await Promise.all([
        this.collections.legacyArticles.find(searchFilter).sort({ score: { $meta: 'textScore' } } as any).skip(skip).limit(limit).toArray(),
        this.collections.legacyArticles.countDocuments(searchFilter)
      ]);
      articles = searchResults;
      total = searchTotal;
    } else {
      const [regularResults, regularTotal] = await Promise.all([
        this.collections.legacyArticles.find(filter).skip(skip).limit(limit).toArray(),
        this.collections.legacyArticles.countDocuments(filter)
      ]);
      articles = regularResults;
      total = regularTotal;
    }

    const articlesWithStringIds = articles.map(article => {
      const converted = databaseToLegacyArticle({
        _id: (article as any)._id?.toString() || '',
        title: (article as any).title,
        content: (article as any).content,
        category: (article as any).category
      });
      return { ...converted, _id: (article as any)._id?.toString(), type: 'article', title: (article as any).title, uploadedAt: new Date() } as any;
    });

    return { articles: articlesWithStringIds, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  public async getLegacyArticleById(id: string): Promise<any | null> {
    await this.ensureConnected();
    if (!this.collections.legacyArticles) throw new Error('Legacy articles collection is not initialized');
    const article: any = await this.collections.legacyArticles.findOne({ _id: new ObjectId(id) } as any);
    if (!article) return null;
    const converted = databaseToLegacyArticle({ _id: article._id?.toString() || '', title: article.title, content: article.content, category: article.category });
    return { ...converted, _id: article._id?.toString(), type: 'article', title: article.title, uploadedAt: new Date() } as any;
  }

  public async updateLegacyArticle(id: string, updates: UpdateLegacyArticleData): Promise<any | null> {
    await this.ensureConnected();
    if (!this.collections.legacyArticles) throw new Error('Legacy articles collection is not initialized');
    const result: any = await this.collections.legacyArticles.findOneAndUpdate(
      { _id: new ObjectId(id) } as any,
      { $set: { ...(updates as any) } },
      { returnDocument: 'after' as any }
    );
    if (!result || !result.value) return null;
    const doc = result.value;
    return { ...doc, _id: doc._id?.toString() } as any;
  }

  public async deleteLegacyArticle(id: string): Promise<boolean> {
    await this.ensureConnected();
    if (!this.collections.legacyArticles) throw new Error('Legacy articles collection is not initialized');
    const result = await this.collections.legacyArticles.deleteOne({ _id: new ObjectId(id) } as any);
    return result.deletedCount === 1;
  }

  // ============== Campaigns ==============
  public async createCampaign(campaignData: CreateCampaignData): Promise<Campaign> {
    await this.ensureConnected();
    if (!this.collections.campaigns) throw new Error('Campaigns collection is not initialized');
    const now = new Date();
    const campaign: ServerCampaign = {
      name: (campaignData as any).name,
      type: (campaignData as any).type,
      status: 'draft',
      template: (campaignData as any).template,
      variables: (campaignData as any).variables,
      mediaUrl: (campaignData as any).mediaUrl,
      mediaType: (campaignData as any).mediaType,
      leadIds: (campaignData as any).leadIds,
      scheduleType: (campaignData as any).scheduleType,
      scheduledAt: (campaignData as any).scheduledAt ? new Date((campaignData as any).scheduledAt) : undefined,
      timezone: (campaignData as any).timezone,
      recurringPattern: (campaignData as any).recurringPattern ? {
        frequency: (campaignData as any).recurringPattern.frequency,
        interval: (campaignData as any).recurringPattern.interval,
        endDate: (campaignData as any).recurringPattern.endDate ? new Date((campaignData as any).recurringPattern.endDate) : undefined
      } : undefined,
      targetCount: ((campaignData as any).leadIds || []).length,
      sentCount: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: (campaignData as any).createdBy
    } as any;
    const result = await this.collections.campaigns.insertOne(campaign as any);
    return { ...(campaign as any), _id: result.insertedId.toString() } as any;
  }

  public async getCampaigns(filters: CampaignFilters = {}, pagination: Partial<CampaignPagination> = {}): Promise<{ campaigns: Campaign[]; total: number; page: number; limit: number; totalPages: number; }> {
    await this.ensureConnected();
    if (!this.collections.campaigns) throw new Error('Campaigns collection is not initialized');
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;
    const query: any = {};

    if ((filters as any).status) {
      if (Array.isArray((filters as any).status)) query.status = { $in: (filters as any).status };
      else query.status = (filters as any).status;
    }
    if ((filters as any).type) {
      if (Array.isArray((filters as any).type)) query.type = { $in: (filters as any).type };
      else query.type = (filters as any).type;
    }
    if ((filters as any).createdBy) query.createdBy = (filters as any).createdBy;
    if ((filters as any).search) {
      query.$or = [
        { name: { $regex: (filters as any).search, $options: 'i' } },
        { template: { $regex: (filters as any).search, $options: 'i' } }
      ];
    }
    if ((filters as any).dateRange) {
      query.createdAt = {};
      const dr: any = (filters as any).dateRange;
      if (dr.start) query.createdAt.$gte = dr.start;
      if (dr.end) query.createdAt.$lte = dr.end;
    }

    const [campaigns, total] = await Promise.all([
      this.collections.campaigns
        .find(query)
        .sort({ [sortBy!]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit!)
        .toArray(),
      this.collections.campaigns.countDocuments(query)
    ]);

    const campaignsWithStringIds = campaigns.map(c => ({ ...c, _id: (c as any)._id?.toString() }));

    return { campaigns: campaignsWithStringIds as any, total, page: page!, limit: limit!, totalPages: Math.ceil(total / (limit!)) };
  }

  public async getCampaignById(id: string): Promise<Campaign | null> {
    await this.ensureConnected();
    if (!this.collections.campaigns) throw new Error('Campaigns collection is not initialized');
    const campaign: any = await this.collections.campaigns.findOne({ _id: new ObjectId(id) } as any);
    if (!campaign) return null;
    return { ...campaign, _id: campaign._id?.toString() } as any;
  }

  public async updateCampaign(id: string, updates: UpdateCampaignData): Promise<Campaign | null> {
    await this.ensureConnected();
    if (!this.collections.campaigns) throw new Error('Campaigns collection is not initialized');
    const updateData: any = { ...updates, updatedAt: new Date() };
    if ((updates as any).scheduledAt) updateData.scheduledAt = new Date((updates as any).scheduledAt);
    if ((updates as any).recurringPattern?.endDate) {
      updateData.recurringPattern = { ...(updates as any).recurringPattern, endDate: new Date((updates as any).recurringPattern.endDate) };
    }
    if ((updates as any).leadIds) updateData.targetCount = (updates as any).leadIds.length;

    const result: any = await this.collections.campaigns.findOneAndUpdate(
      { _id: new ObjectId(id) } as any,
      { $set: updateData },
      { returnDocument: 'after' as any }
    );
    if (!result || !result.value) return null;
    const doc = result.value;
    return { ...doc, _id: doc._id?.toString() } as any;
  }

  public async deleteCampaign(id: string): Promise<boolean> {
    await this.ensureConnected();
    if (!this.collections.campaigns) throw new Error('Campaigns collection is not initialized');
    const result = await this.collections.campaigns.deleteOne({ _id: new ObjectId(id) } as any);
    return result.deletedCount === 1;
  }

  public async getCampaignStats(): Promise<CampaignStats> {
    await this.ensureConnected();
    if (!this.collections.campaigns) throw new Error('Campaigns collection is not initialized');
    const [statusCounts, totalMessages] = await Promise.all([
      this.collections.campaigns.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ] as any).toArray(),
      this.collections.campaigns.aggregate([
        { $group: { _id: null, totalSent: { $sum: '$sentCount' } } }
      ] as any).toArray()
    ]);
    const stats = (statusCounts as any[]).reduce((acc: any, item: any) => { acc[item._id] = item.count; return acc; }, {} as any);
    return {
      totalCampaigns: Object.values(stats).reduce((sum: number, count: any) => sum + (count as number), 0) as number,
      activeCampaigns: stats.active || 0,
      completedCampaigns: stats.completed || 0,
      totalSent: (totalMessages as any)[0]?.totalSent || 0
    } as any;
  }

  // ============== WhatsApp Templates ==============
  public async saveWhatsAppTemplate(templateData: Omit<WhatsAppTemplate, '_id' | 'createdAt'>): Promise<WhatsAppTemplate> {
    await this.ensureConnected();
    if (!this.collections.whatsappTemplates) throw new Error('WhatsApp Templates collection is not initialized');
    const now = new Date();
    const template: WhatsAppTemplate = {
      ...templateData,
      createdAt: now
    };
    const result = await this.collections.whatsappTemplates.insertOne(template as any);
    return { ...template, _id: result.insertedId };
  }

  public async getWhatsAppTemplates(limit?: number): Promise<WhatsAppTemplate[]> {
    await this.ensureConnected();
    if (!this.collections.whatsappTemplates) throw new Error('WhatsApp Templates collection is not initialized');
    const query = this.collections.whatsappTemplates.find({}).sort({ createdAt: -1 });
    if (limit) query.limit(limit);
    const templates = await query.toArray();
    return templates.map(t => ({ ...t, _id: t._id?.toString() })) as any;
  }

  public async getWhatsAppTemplateByContentSid(contentSid: string): Promise<WhatsAppTemplate | null> {
    await this.ensureConnected();
    if (!this.collections.whatsappTemplates) throw new Error('WhatsApp Templates collection is not initialized');
    const template = await this.collections.whatsappTemplates.findOne({ contentSid });
    return template ? { ...template, _id: template._id?.toString() } as any : null;
  }

  // ============== Chat Metadata Helpers (flags) ==============
  /** Set specific fields inside chat metadata (non-destructive) */
  public async setChatMetadataFields(phoneNumber: string, fields: Record<string, unknown>): Promise<void> {
    await this.ensureConnected();
    if (!this.collections.chatHistory) throw new Error('ChatHistory collection is not initialized');
    const setOps: any = {};
    for (const [k, v] of Object.entries(fields)) {
      setOps[`metadata.${k}`] = v;
    }
    await this.collections.chatHistory.updateOne(
      { phoneNumber } as any,
      { $set: setOps, $setOnInsert: { phoneNumber } },
      { upsert: true }
    );
  }

  /** Get chat metadata for a phone */
  public async getChatMetadata(phoneNumber: string): Promise<Record<string, unknown> | null> {
    await this.ensureConnected();
    if (!this.collections.chatHistory) throw new Error('ChatHistory collection is not initialized');
    const doc: any = await this.collections.chatHistory.findOne({ phoneNumber } as any, { projection: { metadata: 1 } } as any);
    return doc?.metadata || null;
  }

  public async getAwaitingName(phoneNumber: string): Promise<boolean> {
    const metadata = await this.getChatMetadata(phoneNumber);
    return Boolean((metadata as any)?.awaitingName);
  }

  public async setAwaitingName(phoneNumber: string, awaiting: boolean): Promise<void> {
    await this.setChatMetadataFields(phoneNumber, { awaitingName: awaiting });
  }
}

// Export singleton instance
export default MongoDBService.getInstance();
