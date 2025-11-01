import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2 } from "lucide-react";
import { safeFetch } from "@/utils/api";
import TemplateViewModal from "./TemplateViewModal";

interface TemplateItem {
  _id: string;
  contentSid: string;
  name: string;
  friendlyName?: string;
  status: string;
  language: string;
  category: string;
  createdAt: string;
}

export default function ApprovedTemplates({ limit }: { limit?: number }) {
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSid, setSelectedSid] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await safeFetch<{ success: boolean; templates: TemplateItem[] }>(`/api/whatsapp/templates${limit ? `?limit=${limit}` : ""}`);
        if (!cancelled) setItems(res.templates || []);
      } catch (e) {
        console.error("Failed to fetch templates", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const id = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [limit]);

  const approved = useMemo(() => items.filter(t => (t.status || "").toLowerCase() === "approved"), [items]);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (approved.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No approved templates yet</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {approved.map(t => (
          <button key={t._id} onClick={() => setSelectedSid(t.contentSid)} className="w-full text-left">
            <Card className="p-3 hover-elevate">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <h4 className="text-sm font-medium truncate">{t.friendlyName || t.name}</h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{t.language?.toUpperCase?.() || "EN"}</span>
                    <span>•</span>
                    <span>{t.category}</span>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>
              </div>
            </Card>
          </button>
        ))}
      </div>

      <TemplateViewModal open={!!selectedSid} onClose={() => setSelectedSid(null)} contentSid={selectedSid} />
    </>
  );
}
