import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatWindowProps {
  phoneNumber: string;
}

export default function ChatWindow({ phoneNumber }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Query for chat history
  const { data: chatHistory, isLoading } = useQuery({
    queryKey: ['chatHistory', phoneNumber],
    queryFn: async () => {
      const response = await fetch(`/api/chat-history/${phoneNumber}`);
      if (!response.ok) throw new Error('Failed to fetch chat history');
      return response.json();
    },
    refetchInterval: 3000 // Refresh every 3 seconds
  });

  // Mutation for sending messages
  const sendMessage = useMutation({
    mutationKey: ['sendMessage', phoneNumber],
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/webhook/twilio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          From: phoneNumber,
          Body: content
        })
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatHistory', phoneNumber] });
    }
  });

  const handleSend = () => {
    if (newMessage.trim()) {
      sendMessage.mutate(newMessage.trim());
      setNewMessage("");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory?.messages]);

  if (isLoading) {
    return (
      <Card className="flex flex-col h-[600px] items-center justify-center">
        <p>Loading chat history...</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="flex items-center gap-3 p-4 border-b">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium">{chatHistory?.metadata?.customerName || phoneNumber}</h3>
          <p className="text-sm text-muted-foreground">
            {chatHistory?.metadata?.labels?.[0] || 'Active'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory?.messages.map((message: Message, index: number) => (
          <div
            key={index}
            className={cn(
              "flex gap-3",
              message.role === "user" && "justify-end"
            )}
          >
            {message.role === "assistant" && (
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                "rounded-lg px-3 py-2 max-w-[80%]",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-50 mt-1">
                {format(new Date(message.timestamp), "p")}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t flex gap-2">
        <Input
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1"
        />
        <Button 
          onClick={handleSend} 
          disabled={sendMessage.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
