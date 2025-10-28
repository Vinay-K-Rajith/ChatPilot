export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatHistory {
  phoneNumber: string; // Can be an actual phone number or an IP identifier
  messages: ChatMessage[];
  lastInteraction: Date;
  metadata?: {
    customerName?: string;
    phone?: string;
    ip?: string;
    labels?: string[];
    channel?: string; // e.g., 'whatsapp', 'web'
  };
}
