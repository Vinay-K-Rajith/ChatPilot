import { z } from "zod";

// Legacy GMT_KB Article interface (existing structure)
export interface LegacyArticle {
  _id: string;
  title: string;    // Required title field
  content: string;  // Article content
  category?: string; // Optional category
}

// PDF Document interface (new structure)
export interface PDFDocument {
  _id: string;
  type: "pdf";
  title: string;
  extractedText: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  pageCount: number;
  category?: string;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Combined interface for frontend consumption
export interface KnowledgeDocument {
  _id: string;
  type: "pdf" | "article";
  title?: string; // For display purposes
  content?: string; // For articles: rich text content, For PDFs: extracted text
  extractedText?: string; // For PDFs: searchable extracted text
  category?: string;
  fileName?: string; // For PDFs: original file name
  fileUrl?: string; // For PDFs: URL to download the file
  fileSize?: number; // For PDFs: file size in bytes
  pageCount?: number; // For PDFs: number of pages
  uploadedAt?: Date; // Optional for articles
  createdAt?: Date;
  updatedAt?: Date;
}

// Zod schemas for validation
export const KnowledgeDocumentTypeSchema = z.enum(["pdf", "article"]);

// Schema for legacy GMT_KB articles
export const CreateLegacyArticleSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z.string().min(1, "Content is required"),
  category: z.string().optional(),
});

// Schema for updating legacy articles
export const UpdateLegacyArticleSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long").optional(),
  content: z.string().min(1, "Content is required").optional(),
  category: z.string().optional(),
});

// Backward compatibility schemas
export const CreateArticleSchema = CreateLegacyArticleSchema;
export const UpdateArticleSchema = UpdateLegacyArticleSchema;

// Schema for PDF metadata (used internally by server after processing)
export const PDFMetadataSchema = z.object({
  type: z.literal("pdf"),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().min(1, "File URL is required"),
  fileSize: z.number().positive("File size must be positive"),
  pageCount: z.number().int().positive("Page count must be a positive integer"),
  extractedText: z.string(),
  category: z.string().optional(),
});

// Generic search/filter schema
export const KnowledgeQuerySchema = z.object({
  type: KnowledgeDocumentTypeSchema.optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
}).transform(data => ({
  ...data,
  page: data.page ?? 1,
  limit: data.limit ?? 20
}));

// Export types for use in client/server
export type CreateLegacyArticleData = z.infer<typeof CreateLegacyArticleSchema>;
export type UpdateLegacyArticleData = z.infer<typeof UpdateLegacyArticleSchema>;
export type CreateArticleData = CreateLegacyArticleData; // Backward compatibility
export type UpdateArticleData = UpdateLegacyArticleData; // Backward compatibility
export type PDFMetadata = z.infer<typeof PDFMetadataSchema>;
export type KnowledgeQuery = z.infer<typeof KnowledgeQuerySchema>;

// Backward compatibility type for existing database entries
export interface DatabaseLegacyArticle {
  _id: string;
  title: string;   // Required title field
  content: string;
  category?: string;
}

// Utility functions for converting between formats
export function legacyArticleToKnowledgeDocument(article: LegacyArticle | DatabaseLegacyArticle): KnowledgeDocument {
  return {
    _id: article._id,
    type: 'article',
    title: article.title,
    content: article.content,
    category: article.category,
  };
}

// Convert database article to LegacyArticle format
export function databaseToLegacyArticle(dbArticle: DatabaseLegacyArticle): LegacyArticle {
  return {
    _id: dbArticle._id,
    title: dbArticle.title,
    content: dbArticle.content,
    category: dbArticle.category
  };
}

export function pdfDocumentToKnowledgeDocument(pdf: PDFDocument): KnowledgeDocument {
  return {
    _id: pdf._id,
    type: 'pdf',
    title: pdf.title,
    extractedText: pdf.extractedText,
    category: pdf.category,
    fileName: pdf.fileName,
    fileUrl: pdf.fileUrl,
    fileSize: pdf.fileSize,
    pageCount: pdf.pageCount,
    uploadedAt: pdf.uploadedAt,
    createdAt: pdf.createdAt,
    updatedAt: pdf.updatedAt,
  };
}

// Common categories (can be extended)
export const KNOWLEDGE_CATEGORIES = [
  "Technical",
  "Products",
  "Pricing",
  "Support",
  "Guidelines",
  "FAQ",
  "Installation",
  "Safety",
  "Legal",
  "Marketing"
] as const;

export type KnowledgeCategory = typeof KNOWLEDGE_CATEGORIES[number];