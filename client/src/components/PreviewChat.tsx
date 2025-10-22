import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, X, MessageSquare, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

interface PreviewChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_MESSAGE: Message = {
  id: "1",
  content: "Hello! We're excited to connect with you—how can Global Metal Direct assist you today?",
  sender: "ai",
  timestamp: new Date(),
};

export default function PreviewChat({ isOpen, onClose }: PreviewChatProps) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Clear messages when chat is closed
  useEffect(() => {
    if (!isOpen) {
      setMessages([INITIAL_MESSAGE]);
      setNewMessage("");
      setIsLoading(false);
    }
  }, [isOpen]);

  // Enhanced auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const endElement = messagesEndRef.current;
    
    if (scrollContainer && endElement) {
      const isScrolledToBottom = 
        scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 100;

      if (isScrolledToBottom) {
        setTimeout(() => {
          endElement.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
      // Initial scroll to bottom when opening
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!newMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setIsLoading(true);

    try {
      // include the updated prompt engineering guidance to help the assistant stay on-topic
      const systemPrompt = `Please follow these conversational guidelines:\n
1) Gently encourage focus on the provided context/topic (industrial metal products and services). Offer polite redirection for off-topic queries, e.g., \"Thank you, let’s explore that further within our offerings.\"\n
2) Cross-check responses against the given input and prompt the user to realign if needed, e.g., \"I’d be happy to help—let’s stay with our industrial metal solutions, please share your thoughts there.\"\n
3) Gracefully decline out-of-scope questions with a professional suggestion to return to the main topic, e.g., \"That’s an interesting point, though it’s outside our current focus; how can I assist with our metal products or services?\"\n
4) Occasionally offer a brief professional summary to reinforce the topic, e.g., \"We’ve discussed [key points] regarding our metal offerings—how else can I support you today?\"`;

      const response = await fetch('/api/chat/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: newMessage,
          conversationHistory: messages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.content
          }))
          ,
          systemPrompt
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.content || data.message || "I'm sorry, I couldn't process your request at the moment.",
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I encountered an error. Please try again later.",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
    setNewMessage("");
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-hidden">
      <Card className="w-full max-w-4xl mx-4 h-[90vh] max-h-[700px] flex flex-col shadow-2xl border-0 bg-card">
        <CardHeader className="flex-none flex flex-row items-center justify-between gap-4 pb-3 border-b border-card-border bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">Preview Chat</CardTitle>
              <p className="text-sm text-muted-foreground">Test the AI chatbot functionality - Focused on industrial metal products</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="h-8 w-8 hover:bg-muted"
              title="Reset conversation"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
              title="Close chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 min-h-0 relative">
          <div 
            ref={scrollContainerRef} 
            className="absolute inset-0 flex flex-col"
            style={{ 
              height: "calc(100% - 84px)" // Subtract input area height
            }}
          >
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin hover:scrollbar-thumb-gray-400 scrollbar-track-transparent dark:hover:scrollbar-thumb-gray-600" data-testid="preview-chat-messages">
              <div className="flex flex-col justify-end min-h-full">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3 items-start mb-4 last:mb-0",
                      message.sender === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.sender === "ai" && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2 max-w-[70%] min-w-0",
                        message.sender === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                      <p className={cn(
                        "text-xs mt-1",
                        message.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {format(message.timestamp, "HH:mm")}
                      </p>
                    </div>
                    {message.sender === "user" && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          U
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 items-start justify-start mb-4">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg px-4 py-2 bg-muted">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-px w-full" />
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 flex-none p-4 border-t border-card-border bg-background">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Ask about industrial metal products, pricing, specifications..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                data-testid="preview-chat-input"
                className="flex-1"
              />
              <Button 
                onClick={handleSend} 
                size="icon" 
                disabled={isLoading || !newMessage.trim()}
                data-testid="preview-chat-send"
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 text-xs text-muted-foreground text-center">
              💡 Try asking about steel sheets, aluminum products, pricing, or specifications
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
