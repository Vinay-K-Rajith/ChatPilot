import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  engagementScore: number;
  lastContactedAt?: Date;
}

interface LeadTableProps {
  leads: Lead[];
  onContactLead?: (id: string) => void;
}

export default function LeadTable({ leads, onContactLead }: LeadTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-chart-2";
      case "contacted":
        return "bg-chart-4";
      case "qualified":
        return "bg-chart-1";
      case "converted":
        return "bg-chart-3";
      case "lost":
        return "bg-muted";
      default:
        return "bg-muted";
    }
  };

  const getEngagementColor = (score: number) => {
    if (score >= 80) return "text-chart-3";
    if (score >= 50) return "text-chart-4";
    return "text-muted-foreground";
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-card-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Lead
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Engagement
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Last Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover-elevate" data-testid={`lead-row-${lead.id}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {lead.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{lead.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {lead.phone}
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary" className={getStatusColor(lead.status)}>
                    {lead.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${lead.engagementScore >= 80 ? 'bg-chart-3' : lead.engagementScore >= 50 ? 'bg-chart-4' : 'bg-muted-foreground'}`}
                        style={{ width: `${lead.engagementScore}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${getEngagementColor(lead.engagementScore)}`}>
                      {lead.engagementScore}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {lead.lastContactedAt ? format(lead.lastContactedAt, "MMM d, yyyy") : "Never"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onContactLead?.(lead.id)}
                    data-testid={`button-contact-${lead.id}`}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
