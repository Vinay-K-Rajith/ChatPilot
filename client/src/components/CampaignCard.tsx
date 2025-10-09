import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Send, Clock } from "lucide-react";
import { format } from "date-fns";

interface Campaign {
  id: string;
  name: string;
  template: string;
  scheduledAt?: Date;
  status: "draft" | "scheduled" | "sent" | "active";
  targetCount: number;
  sentCount: number;
}

interface CampaignCardProps {
  campaign: Campaign;
  onEdit?: (id: string) => void;
  onSend?: (id: string) => void;
}

export default function CampaignCard({ campaign, onEdit, onSend }: CampaignCardProps) {
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
        
        <div className="space-y-2">
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
          
          {campaign.status === "sent" && (
            <div className="flex items-center gap-2 text-sm">
              <Send className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Sent:</span>
              <span className="font-medium">{campaign.sentCount} / {campaign.targetCount}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit?.(campaign.id)}
            data-testid={`button-edit-campaign-${campaign.id}`}
          >
            Edit
          </Button>
          {campaign.status === "draft" && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => onSend?.(campaign.id)}
              data-testid={`button-send-campaign-${campaign.id}`}
            >
              <Clock className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
