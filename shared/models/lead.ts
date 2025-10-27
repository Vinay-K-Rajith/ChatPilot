import { z } from 'zod';

// Define the status enum
export const LeadStatusEnum = z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']);

// Zod schema for Lead validation
export const LeadSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  phone: z.string().min(1, 'Phone is required').regex(/^[\+]?[\d\s\-\(\)]+$/, 'Invalid phone number format'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  status: LeadStatusEnum.default('new'),
  engagementScore: z.number().min(0).max(100).default(0),
  lastContactedAt: z.date().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// Schema for creating a new lead (omits MongoDB generated fields)
export const CreateLeadSchema = LeadSchema.omit({ 
  _id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Schema for updating a lead (all fields optional except _id)
export const UpdateLeadSchema = LeadSchema.partial().extend({
  _id: z.string(),
  updatedAt: z.date().default(() => new Date()),
});

// Schema for Excel import (more lenient validation)
export const ImportLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().optional().transform(val => val || undefined),
  status: LeadStatusEnum.optional().default('new'),
  engagementScore: z.coerce.number().min(0).max(100).optional().default(0),
  lastContactedAt: z.coerce.date().optional(),
});

// TypeScript types derived from schemas
export type Lead = z.infer<typeof LeadSchema>;
export type CreateLead = z.infer<typeof CreateLeadSchema>;
export type UpdateLead = z.infer<typeof UpdateLeadSchema>;
export type ImportLead = z.infer<typeof ImportLeadSchema>;
export type LeadStatus = z.infer<typeof LeadStatusEnum>;

// Helper type for API responses
export type LeadWithId = Lead & { _id: string };

// Filter options for lead queries
export interface LeadFilters {
  status?: LeadStatus | LeadStatus[];
  engagementScore?: {
    min?: number;
    max?: number;
  };
  search?: string; // Search in name, phone, email
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

// Pagination options
export interface PaginationOptions {
  page?: number;
  limit?: number;
  // Relax to generic string to align server query passthrough and avoid TS mismatch
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API response types
export interface LeadsResponse {
  leads: LeadWithId[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ImportResponse {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    errors: string[];
    data: any;
  }>;
}