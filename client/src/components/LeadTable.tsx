import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, MessageSquare, Edit, Trash2, Trash } from "lucide-react";
import { format } from "date-fns";
import type { LeadWithId } from "../../../shared/models/lead";

interface LeadTableProps {
  leads: LeadWithId[];
  selectedLeads?: string[];
  onSelectLead?: (id: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onContactLead?: (id: string) => void;
  onEditLead?: (lead: LeadWithId) => void;
  onDeleteLead?: (id: string) => void;
  isLoading?: boolean;
}

export default function LeadTable({ 
  leads, 
  selectedLeads = [],
  onSelectLead,
  onSelectAll,
  onContactLead,
  onEditLead,
  onDeleteLead,
  isLoading = false
}: LeadTableProps) {
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

  const allSelected = leads.length > 0 && selectedLeads.length === leads.length;
  const someSelected = selectedLeads.length > 0 && selectedLeads.length < leads.length;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-card-border">
            <tr>
              {onSelectLead && (
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el && 'indeterminate' in el) {
                        (el as any).indeterminate = someSelected;
                      }
                    }}
                    onCheckedChange={(checked) => onSelectAll?.(!!checked)}
                    data-testid="select-all-leads"
                  />
                </th>
              )}
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
            {leads.length === 0 ? (
              <tr>
                <td colSpan={onSelectLead ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground">
                  {isLoading ? "Loading leads..." : "No leads found"}
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const leadId = lead._id || '';
                const isSelected = selectedLeads.includes(leadId);
                
                return (
                  <tr key={leadId} className={`hover-elevate ${isSelected ? 'bg-muted/30' : ''}`} data-testid={`lead-row-${leadId}`}>
                    {onSelectLead && (
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => onSelectLead(leadId, !!checked)}
                          data-testid={`select-lead-${leadId}`}
                        />
                      </td>
                    )}
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
                      <div className="flex items-center gap-1">
                        {onContactLead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onContactLead(leadId)}
                            data-testid={`button-contact-${leadId}`}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Contact
                          </Button>
                        )}
                        {onEditLead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditLead(lead)}
                            data-testid={`button-edit-${leadId}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onDeleteLead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteLead(leadId)}
                            data-testid={`button-delete-${leadId}`}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
