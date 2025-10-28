import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useChatHistory } from "@/hooks/useChatHistory";
import { User } from "lucide-react";

export default function ConversationList({ onSelect, selectedId, limit }: { 
  onSelect?: (phoneNumber: string) => void;
  selectedId?: string;
  limit?: number;
}) {
  const { chatHistories, isLoading } = useChatHistory({
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  const displayedChats = limit ? chatHistories.slice(0, limit) : chatHistories;

  const getStatusColor = (metadata?: { labels?: string[] }) => {
    if (!metadata?.labels?.length) return "bg-muted";
    const hasActive = metadata.labels.includes("active");
    const hasWaiting = metadata.labels.includes("waiting");
    
    if (hasActive) return "bg-chart-3";
    if (hasWaiting) return "bg-chart-4";
    return "bg-muted";
  };

  if (isLoading) {
    return <div className="p-4">Loading conversations...</div>;
  }

  return (
    <div className="space-y-2">
      {displayedChats.map((chat) => (
        <Card
          key={chat.phoneNumber}
          className={cn(
            "p-4 cursor-pointer hover-elevate transition-colors",
            selectedId === chat.phoneNumber && "border-primary"
          )}
          onClick={() => onSelect?.(chat.phoneNumber)}
        >
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-sm font-medium truncate">
                  {chat.metadata?.customerName || chat.phoneNumber}
                </h4>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(chat.lastInteraction), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate mb-2">
                {chat.messages[chat.messages.length - 1]?.content || 'No messages'}
              </p>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", getStatusColor(chat.metadata))}
                >
                  {chat.metadata?.labels?.[0] || 'new'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
