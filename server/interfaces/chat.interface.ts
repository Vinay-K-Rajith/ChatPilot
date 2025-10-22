export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatHistory {
  phoneNumber: string;
  messages: ChatMessage[];
  lastInteraction: Date;
  metadata?: {
    customerName?: string;
    labels?: string[];
  };
}