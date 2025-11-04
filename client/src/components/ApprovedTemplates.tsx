import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, CheckCircle, Clock, AlertCircle, Info } from "lucide-react";
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

type ApprovalStatus = 'approved' | 'pending' | 'rejected' | 'disabled' | 'unknown';

const STATUS_CONFIG: Record<ApprovalStatus, { color: string; icon: any; label: string; bg: string }> = {
  approved: { color: 'text-green-600', icon: CheckCircle, label: 'Approved', bg: 'bg-green-50 border-green-200' },
  pending: { color: 'text-amber-600', icon: Clock, label: 'Pending', bg: 'bg-amber-50 border-amber-200' },
  rejected: { color: 'text-red-600', icon: AlertCircle, label: 'Rejected', bg: 'bg-red-50 border-red-200' },
  disabled: { color: 'text-gray-600', icon: Info, label: 'Disabled', bg: 'bg-gray-50 border-gray-200' },
  unknown: { color: 'text-slate-600', icon: Info, label: 'Unknown', bg: 'bg-slate-50 border-slate-200' },
};

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
    const id = setInterval(load, 10000); // Increased refresh rate to 10s for real-time status
    return () => { cancelled = true; clearInterval(id); };
  }, [limit]);

  const grouped = useMemo(() => {
    const getStatusConfig = (status?: string): { normalized: ApprovalStatus } => {
      const normalized = (status?.toLowerCase() || 'unknown') as ApprovalStatus;
      return { normalized };
    };

    const groups: Record<ApprovalStatus, TemplateItem[]> = {
      approved: [],
      pending: [],
      rejected: [],
      disabled: [],
      unknown: [],
    };
    
    items.forEach(t => {
      const { normalized } = getStatusConfig(t.status);
      groups[normalized].push(t);
    });
    
    return groups;
  }, [items]);

  const getStatusConfig = (status?: string): { config: typeof STATUS_CONFIG[ApprovalStatus], normalized: ApprovalStatus } => {
    const normalized = (status?.toLowerCase() || 'unknown') as ApprovalStatus;
    return {
      config: STATUS_CONFIG[normalized] || STATUS_CONFIG.unknown,
      normalized
    };
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No WhatsApp templates found</p>
        </div>
      </Card>
    );
  }

  const renderTemplateCard = (t: TemplateItem) => {
    const { config, normalized } = getStatusConfig(t.status);
    const StatusIcon = config.icon;
    
    return (
      <button key={t._id} onClick={() => setSelectedSid(t.contentSid)} className="w-full text-left">
        <Card className={`p-3 hover-elevate transition-all ${config.bg}`}>
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
                <span>•</span>
                <span className="text-xs opacity-75">{new Date(t.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <Badge variant="outline" className={`${config.bg} ${config.color} border-current/20 flex items-center gap-1`}>
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </Badge>
          </div>
        </Card>
      </button>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {/* Approved templates first */}
        {grouped.approved.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-green-700">
              <CheckCircle className="h-4 w-4" />
              Approved ({grouped.approved.length})
            </div>
            {grouped.approved.map(renderTemplateCard)}
          </div>
        )}

        {/* Pending templates */}
        {grouped.pending.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
              <Clock className="h-4 w-4" />
              Pending Review ({grouped.pending.length})
            </div>
            {grouped.pending.map(renderTemplateCard)}
          </div>
        )}

        {/* Other statuses */}
        {(grouped.rejected.length > 0 || grouped.disabled.length > 0 || grouped.unknown.length > 0) && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Other</div>
            {grouped.rejected.map(renderTemplateCard)}
            {grouped.disabled.map(renderTemplateCard)}
            {grouped.unknown.map(renderTemplateCard)}
          </div>
        )}
      </div>

      <TemplateViewModal open={!!selectedSid} onClose={() => setSelectedSid(null)} contentSid={selectedSid} />
    </>
  );
}
