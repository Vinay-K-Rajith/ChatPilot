// Validation utilities for Testing page

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a WhatsApp phone number
 * Accepts formats: +1234567890, 1234567890, whatsapp:+1234567890
 */
export function validateWhatsAppPhoneNumber(phone: string): ValidationResult {
  if (!phone || phone.trim().length === 0) {
    return { isValid: false, error: "Phone number is required" };
  }

  // Remove common prefixes and spaces
  const cleanedPhone = phone
    .replace(/^whatsapp:/i, "")
    .replace(/\s+/g, "")
    .trim();

  // Check if it matches international format (with or without +)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  
  if (!phoneRegex.test(cleanedPhone)) {
    return { 
      isValid: false, 
      error: "Invalid phone number format. Use international format (e.g., +1234567890)" 
    };
  }

  // Check minimum and maximum length
  const digitsOnly = cleanedPhone.replace(/^\+/, "");
  if (digitsOnly.length < 7) {
    return { isValid: false, error: "Phone number too short (minimum 7 digits)" };
  }
  
  if (digitsOnly.length > 15) {
    return { isValid: false, error: "Phone number too long (maximum 15 digits)" };
  }

  return { isValid: true };
}

/**
 * Formats phone number for WhatsApp API
 * Ensures it starts with + and removes any whatsapp: prefix
 */
export function formatPhoneNumberForWhatsApp(phone: string): string {
  const cleaned = phone
    .replace(/^whatsapp:/i, "")
    .replace(/\s+/g, "")
    .trim();
  
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

/**
 * Validates uploaded media files for WhatsApp
 * WhatsApp supports: images (jpeg, png, gif), videos (mp4, 3gpp), audio, documents
 */
export function validateMediaFile(file: File): ValidationResult {
  if (!file) {
    return { isValid: false, error: "No file selected" };
  }

  // Check file size (WhatsApp limit is typically 16MB for media, 100MB for documents)
  const maxSizeBytes = file.type.startsWith('image/') ? 5 * 1024 * 1024 : // 5MB for images
                       file.type.startsWith('video/') ? 16 * 1024 * 1024 : // 16MB for videos
                       file.type.startsWith('audio/') ? 16 * 1024 * 1024 : // 16MB for audio
                       100 * 1024 * 1024; // 100MB for documents

  if (file.size > maxSizeBytes) {
    const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
    return { 
      isValid: false, 
      error: `File size exceeds limit (${maxSizeMB}MB maximum for ${file.type.split('/')[0]} files)` 
    };
  }

  // Check supported file types
  const supportedTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // Videos  
    'video/mp4', 'video/3gpp', 'video/quicktime',
    // Audio
    'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg',
    // Documents
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ];

  if (!supportedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: `Unsupported file type: ${file.type}. Please use images, videos, audio, or document files.` 
    };
  }

  return { isValid: true };
}

/**
 * Validates message content
 */
export function validateMessage(message: string): ValidationResult {
  if (!message || message.trim().length === 0) {
    return { isValid: false, error: "Message cannot be empty" };
  }

  // WhatsApp message limit is 4096 characters
  if (message.length > 4096) {
    return { 
      isValid: false, 
      error: `Message too long (${message.length}/4096 characters)` 
    };
  }

  return { isValid: true };
}

/**
 * Check if we have either valid message text or valid media file
 */
export function validateMessageOrMedia(message: string, file: File | null): ValidationResult {
  const hasValidMessage = message && message.trim().length > 0;
  const hasValidFile = file !== null;

  if (!hasValidMessage && !hasValidFile) {
    return { 
      isValid: false, 
      error: "Please provide either a message or attach a media file" 
    };
  }

  if (hasValidMessage) {
    const messageValidation = validateMessage(message);
    if (!messageValidation.isValid) {
      return messageValidation;
    }
  }

  if (hasValidFile) {
    const fileValidation = validateMediaFile(file);
    if (!fileValidation.isValid) {
      return fileValidation;
    }
  }

  return { isValid: true };
}

/**
 * Get file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}