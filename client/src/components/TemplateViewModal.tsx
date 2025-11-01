import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, ImageIcon } from "lucide-react";
import { safeFetch } from "@/utils/api";

interface TemplateViewModalProps {
  open: boolean;
  onClose: () => void;
  contentSid: string | null;
}

export default function TemplateViewModal({ open, onClose, contentSid }: TemplateViewModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    if (!open || !contentSid) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const resp = await safeFetch<{ success: boolean; template?: any; content?: any; status?: string }>(`/api/whatsapp/templates/${contentSid}`);
        if (!cancelled) setDetails(resp);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load template");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [open, contentSid]);

  const renderBody = () => {
    const body = details?.content?.types?.["twilio/text"]?.body || details?.content?.types?.["twilio/media"]?.body || details?.template?.body;
    const media = details?.content?.types?.["twilio/media"]?.media || (details?.template?.mediaUrl ? [details.template.mediaUrl] : []);
    const vars = details?.content?.variables || details?.template?.variables;

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">{body || "No body found"}</div>
        {Array.isArray(media) && media.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <ImageIcon className="h-4 w-4" />
            <a href={media[0]} target="_blank" rel="noreferrer" className="text-primary underline truncate max-w-[420px]">{media[0]}</a>
          </div>
        )}
        {vars && Object.keys(vars).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(vars).map(([k, v]) => (
              <Badge key={k} variant="secondary">{'{{' + k + '}}'} = {String(v)}</Badge>
            ))}
          </div>
        )}
      </div>
    );
  };

  const title = details?.template?.friendlyName || details?.template?.name || details?.content?.friendly_name || contentSid || "Template";
  const meta = {
    language: details?.template?.language || details?.content?.language,
    category: details?.template?.category,
    status: details?.status || "unknown",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>
        <Separator />
        {loading ? (
          <div className="py-10 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : error ? (
          <div className="py-6 text-sm text-red-600">{error}</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {meta.language && <span>{String(meta.language).toUpperCase()}</span>}
              {meta.category && (
                <>
                  <span>•</span>
                  <span>{meta.category}</span>
                </>
              )}
              {meta.status && (
                <>
                  <span>•</span>
                  <Badge variant="outline">{meta.status}</Badge>
                </>
              )}
            </div>
            {renderBody()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
