import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { createRequire } from 'module';
import type { PDFMetadata } from '../../shared/knowledge';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse').default;

export interface PDFProcessingResult {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  pageCount: number;
  extractedText: string;
  title: string;
}

/**
 * PDF Service - Handles PDF file storage and text extraction
 */
export class PDFService {
  private static instance: PDFService;
  private uploadsDir: string;
  private baseUrl: string;

  private constructor() {
    // Configure uploads directory - can be environment variable
    this.uploadsDir = process.env.FILE_UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'knowledge');
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.ensureUploadDirectory();
  }

  public static getInstance(): PDFService {
    if (!PDFService.instance) {
      PDFService.instance = new PDFService();
    }
    return PDFService.instance;
  }

  /**
   * Ensure the upload directory exists
   */
  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      console.log(`Created uploads directory: ${this.uploadsDir}`);
    }
  }

  /**
   * Process uploaded PDF file
   * @param fileBuffer The PDF file buffer
   * @param originalName Original filename
   * @param maxSizeBytes Maximum file size in bytes (default: 10MB)
   */
  public async processPDF(
    fileBuffer: Buffer, 
    originalName: string,
    maxSizeBytes: number = 10 * 1024 * 1024 // 10MB default
  ): Promise<PDFProcessingResult> {
    try {
      // Validate file size
      if (fileBuffer.length > maxSizeBytes) {
        throw new Error(`File size ${Math.round(fileBuffer.length / 1024 / 1024)}MB exceeds maximum ${Math.round(maxSizeBytes / 1024 / 1024)}MB`);
      }

      // Validate file is PDF (basic check)
      if (!this.isPDFBuffer(fileBuffer)) {
        throw new Error('Invalid PDF file format');
      }

      // Extract text and metadata using pdf-parse
      const pdfData = await pdf(fileBuffer, {
        // Options for better text extraction
        max: 0, // Extract all pages
      });

      if (!pdfData.text || pdfData.text.trim().length === 0) {
        throw new Error('PDF appears to be empty or contains no extractable text');
      }

      // Generate unique filename
      const fileExtension = path.extname(originalName) || '.pdf';
      const baseName = path.basename(originalName, fileExtension);
      const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
      const uniqueFileName = `${baseName}_${hash.substring(0, 8)}${fileExtension}`;

      // Save file to disk
      const filePath = path.join(this.uploadsDir, uniqueFileName);
      await fs.writeFile(filePath, fileBuffer);

      // Generate public URL
      const fileUrl = `${this.baseUrl}/uploads/knowledge/${uniqueFileName}`;

      // Generate title from filename if not provided
      const title = this.generateTitleFromFilename(baseName);

      // Clean extracted text (remove excessive whitespace, normalize)
      const cleanedText = this.cleanExtractedText(pdfData.text);

      const result: PDFProcessingResult = {
        fileName: uniqueFileName,
        fileUrl,
        fileSize: fileBuffer.length,
        pageCount: pdfData.numpages || 1,
        extractedText: cleanedText,
        title,
      };

      console.log(`PDF processed successfully: ${originalName} -> ${uniqueFileName} (${pdfData.numpages} pages, ${cleanedText.length} characters)`);
      return result;

    } catch (error: any) {
      console.error('PDF processing failed:', error);
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF buffer without saving to disk
   * @param fileBuffer The PDF file buffer
   * @param maxSizeBytes Maximum file size in bytes (default: 10MB)
   */
  public async extractTextFromBuffer(
    fileBuffer: Buffer,
    maxSizeBytes: number = 10 * 1024 * 1024 // 10MB default
  ): Promise<string> {
    try {
      // Validate file size
      if (fileBuffer.length > maxSizeBytes) {
        throw new Error(`File size ${Math.round(fileBuffer.length / 1024 / 1024)}MB exceeds maximum ${Math.round(maxSizeBytes / 1024 / 1024)}MB`);
      }

      // Validate file is PDF (basic check)
      if (!this.isPDFBuffer(fileBuffer)) {
        throw new Error('Invalid PDF file format');
      }

      // Extract text using pdf-parse
      const pdfData = await pdf(fileBuffer, {
        max: 0, // Extract all pages
      });

      if (!pdfData.text || pdfData.text.trim().length === 0) {
        throw new Error('PDF appears to be empty or contains no extractable text');
      }

      // Clean and return extracted text
      const cleanedText = this.cleanExtractedText(pdfData.text);
      console.log(`PDF text extracted successfully (${pdfData.numpages} pages, ${cleanedText.length} characters)`);
      
      return cleanedText;
    } catch (error: any) {
      console.error('PDF text extraction failed:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Delete a PDF file from storage
   * @param fileName The filename to delete
   */
  public async deletePDFFile(fileName: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadsDir, fileName);
      await fs.unlink(filePath);
      console.log(`PDF file deleted: ${fileName}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') { // Ignore "file not found" errors
        console.error(`Failed to delete PDF file ${fileName}:`, error);
        throw new Error(`Failed to delete file: ${error.message}`);
      }
    }
  }

  /**
   * Check if buffer contains a PDF file (basic magic number check)
   */
  private isPDFBuffer(buffer: Buffer): boolean {
    // PDF files start with "%PDF-"
    return buffer.length > 4 && buffer.toString('ascii', 0, 4) === '%PDF';
  }

  /**
   * Generate a readable title from filename
   */
  private generateTitleFromFilename(baseName: string): string {
    return baseName
      .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
      .replace(/\b\w/g, l => l.toUpperCase()) // Title case
      .trim();
  }

  /**
   * Clean extracted text from PDF
   */
  private cleanExtractedText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n\n') // Normalize paragraph breaks
      .trim();
  }

  /**
   * Get file information without processing
   * @param fileName The filename to check
   */
  public async getFileInfo(fileName: string): Promise<{ exists: boolean; size?: number; url?: string }> {
    try {
      const filePath = path.join(this.uploadsDir, fileName);
      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size,
        url: `${this.baseUrl}/uploads/knowledge/${fileName}`
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return { exists: false };
      }
      throw error;
    }
  }

  /**
   * Validate PDF file before processing (external validation)
   */
  public static validatePDFFile(
    buffer: Buffer,
    originalName: string,
    maxSizeBytes: number = 10 * 1024 * 1024
  ): { valid: boolean; error?: string } {
    // Check file size
    if (buffer.length > maxSizeBytes) {
      return {
        valid: false,
        error: `File size ${Math.round(buffer.length / 1024 / 1024)}MB exceeds maximum ${Math.round(maxSizeBytes / 1024 / 1024)}MB`
      };
    }

    // Check if it's a PDF
    if (buffer.length < 4 || buffer.toString('ascii', 0, 4) !== '%PDF') {
      return {
        valid: false,
        error: 'File is not a valid PDF'
      };
    }

    // Check filename
    if (!originalName || !originalName.toLowerCase().endsWith('.pdf')) {
      return {
        valid: false,
        error: 'File must have .pdf extension'
      };
    }

    return { valid: true };
  }
}

export default PDFService.getInstance();