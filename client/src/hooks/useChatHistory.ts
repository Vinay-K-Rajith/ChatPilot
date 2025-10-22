import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatHistory {
  phoneNumber: string;
  messages: Message[];
  lastInteraction: Date;
  metadata?: {
    customerName?: string;
    labels?: string[];
  };
}

interface UseChatHistoryOptions {
  limit?: number;
  skip?: number;
  refetchInterval?: number;
}

export function useChatHistory(options: UseChatHistoryOptions = {}) {
  const { limit = 20, skip = 0, refetchInterval = 5000 } = options;
  const queryClient = useQueryClient();

  const { data: chatHistories, isLoading } = useQuery<ChatHistory[]>({
    queryKey: ['chatHistories', limit, skip],
    queryFn: async () => {
      const response = await fetch(`/api/chat-history?limit=${limit}&skip=${skip}`);
      if (!response.ok) throw new Error('Failed to fetch chat histories');
      return response.json();
    },
    refetchInterval
  });

  const updateChatMetadata = async (phoneNumber: string, metadata: Partial<ChatHistory['metadata']>) => {
    const response = await fetch(`/api/chat-history/${phoneNumber}/metadata`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata })
    });
    if (!response.ok) throw new Error('Failed to update chat metadata');
    await queryClient.invalidateQueries({ queryKey: ['chatHistories'] });
  };

  return {
    chatHistories: chatHistories || [],
    isLoading,
    updateChatMetadata
  };
}