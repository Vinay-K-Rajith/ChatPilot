import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  leadName: string;
  lastMessage: string;
  timestamp: Date;
  status: "active" | "waiting" | "closed";
  unread?: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  onSelect?: (id: string) => void;
  selectedId?: string;
}

export default function ConversationList({ conversations, onSelect, selectedId }: ConversationListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-chart-3";
      case "waiting":
        return "bg-chart-4";
      case "closed":
        return "bg-muted";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="space-y-2">
      {conversations.map((conv) => (
        <Card
          key={conv.id}
          className={cn(
            "p-4 cursor-pointer hover-elevate transition-colors",
            selectedId === conv.id && "border-primary"
          )}
          onClick={() => onSelect?.(conv.id)}
          data-testid={`conversation-item-${conv.id}`}
        >
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {conv.leadName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-sm font-medium truncate">{conv.leadName}</h4>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(conv.timestamp, { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate mb-2">{conv.lastMessage}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={cn("text-xs", getStatusColor(conv.status))}>
                  {conv.status}
                </Badge>
                {conv.unread && conv.unread > 0 && (
                  <Badge variant="default" className="text-xs">
                    {conv.unread} new
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
