import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2 } from "lucide-react";
import { safeFetch } from "@/utils/api";
import { formatDistanceToNow } from "date-fns";

interface Template {
  _id: string;
  contentSid: string;
  name: string;
  friendlyName?: string;
  status: string; // Fetched live from Twilio
  language: string;
  category: string;
  createdAt: string;
}

export default function TemplateStatus({ limit = 5 }: { limit?: number }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      try {
        const response = await safeFetch<{ success: boolean; templates: Template[] }>(
          `/api/whatsapp/templates${limit ? `?limit=${limit}` : ""}`
        );
        if (!cancelled && response?.templates) {
          setTemplates(response.templates);
        }
      } catch (error) {
        console.error("Failed to load templates:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadTemplates();
    const interval = setInterval(loadTemplates, 30000); // Refresh every 30 seconds

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [limit]);

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "approved" || s === "accepted") return "bg-green-500/10 text-green-600 border-green-500/20";
    if (s === "rejected" || s === "failed") return "bg-red-500/10 text-red-600 border-red-500/20";
    if (s === "pending" || s === "submitted") return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    return "bg-muted text-muted-foreground";
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (templates.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No templates submitted yet</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {templates.map((template) => (
        <Card key={template._id} className="p-3 hover-elevate">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h4 className="text-sm font-medium truncate">
                  {template.friendlyName || template.name}
                </h4>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{template.language.toUpperCase()}</span>
                <span>•</span>
                <span>{template.category}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(template.createdAt), { addSuffix: true })}
              </div>
            </div>
            <Badge className={getStatusColor(template.status)} variant="outline">
              {template.status}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
