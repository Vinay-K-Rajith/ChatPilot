import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, Users, Send, Clock, Pause, Play, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Campaign {
  id: string;
  name: string;
  template: string;
  scheduledAt?: Date;
  status: "draft" | "scheduled" | "sent" | "active" | "paused" | "completed";
  targetCount: number;
  sentCount: number;
}

interface CampaignCardProps {
  campaign: Campaign;
  onEdit?: (id: string) => void;
  onSend?: (id: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

export default function CampaignCard({ campaign, onEdit, onSend, onPause, onResume, onDelete, isLoading }: CampaignCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-muted";
      case "scheduled":
        return "bg-chart-4";
      case "sent":
        return "bg-chart-3";
      case "active":
        return "bg-chart-1";
      default:
        return "bg-muted";
    }
  };

  return (
    <Card className="hover-elevate transition-all" data-testid={`campaign-card-${campaign.id}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">{campaign.name}</CardTitle>
        <Badge variant="secondary" className={getStatusColor(campaign.status)}>
          {campaign.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{campaign.template}</p>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Target:</span>
            <span className="font-medium">{campaign.targetCount} leads</span>
          </div>
          
          {campaign.scheduledAt && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Scheduled:</span>
              <span className="font-medium">{format(campaign.scheduledAt, "MMM d, yyyy HH:mm")}</span>
            </div>
          )}
          
          {(campaign.status === "active" || campaign.status === "completed" || campaign.sentCount > 0) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Send className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Progress:</span>
                <span className="font-medium">{campaign.sentCount} / {campaign.targetCount}</span>
              </div>
              <Progress 
                value={(campaign.sentCount / campaign.targetCount) * 100} 
                className="h-2"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit?.(campaign.id)}
            disabled={isLoading}
            data-testid={`button-edit-campaign-${campaign.id}`}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Edit"}
          </Button>
          
          {campaign.status === "draft" && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => onSend?.(campaign.id)}
              disabled={isLoading}
              data-testid={`button-send-campaign-${campaign.id}`}
            >
              <Clock className="h-4 w-4 mr-2" />
              Send Now
            </Button>
          )}
          
          {campaign.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPause?.(campaign.id)}
              disabled={isLoading}
              data-testid={`button-pause-campaign-${campaign.id}`}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
          
          {campaign.status === "paused" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResume?.(campaign.id)}
              disabled={isLoading}
              data-testid={`button-resume-campaign-${campaign.id}`}
            >
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}
          
          {(campaign.status === "draft" || campaign.status === "paused") && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete?.(campaign.id)}
              disabled={isLoading}
              data-testid={`button-delete-campaign-${campaign.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
