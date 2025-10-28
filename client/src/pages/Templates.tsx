import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, CheckCircle, XCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { safeFetch } from "@/utils/api";

interface SubmitResult {
  success: boolean;
  status?: string;
  contentSid?: string;
  approvalSid?: string;
  error?: string;
  provider?: string;
}

export default function Templates() {
  const { toast } = useToast();

  const [friendlyName, setFriendlyName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [language, setLanguage] = useState("en");
  const [category, setCategory] = useState("UTILITY");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [footer, setFooter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const variablesInBody = (body.match(/\{\{\d+\}\}/g) || []).length;

  const isValid = () => templateName.trim() && language && category && body.trim().length > 0;

  const buildPayload = () => {
    const variables: Record<string, string> = {};
    for (let i = 1; i <= variablesInBody; i++) variables[String(i)] = `value_${i}`;

    const types: any = mediaUrl.trim()
      ? { "twilio/media": { body: body.trim(), media: [mediaUrl.trim()] } }
      : { "twilio/text": { body: body.trim() } };

    return {
      language,
      friendly_name: friendlyName.trim() || templateName.trim(),
      types,
      variables: Object.keys(variables).length ? variables : undefined,
      name: templateName.trim(),
      category,
    } as any;
  };

  const pollStatus = async (contentSid: string) => {
    try {
      const s = await safeFetch<{ success: boolean; status?: string }>(`/api/whatsapp/templates/${contentSid}/status`);
      if (s?.status) setStatus(s.status);
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload = buildPayload();
      const res = await safeFetch<SubmitResult>("/api/whatsapp/templates/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setResult(res);
      if (res.success) {
        toast({ title: "Submitted for approval", description: `Status: ${res.status || "submitted"}` });
        if (res.contentSid) {
          setStatus(res.status || null);
          // initial poll
          pollStatus(res.contentSid);
        }
      } else {
        toast({ title: "Submission failed", description: res.error || "Unknown error", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to submit template", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="relative overflow-hidden rounded-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-[#1E3A5F]/95 via-[#2C5F8D]/90 to-[#4A90BF]/95" />
        <div className="relative p-6 text-white flex items-center gap-3">
          <FileText className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">WhatsApp Template Approval</h1>
            <p className="text-white/80 mt-1">Create and submit templates to WhatsApp via Twilio</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Template</CardTitle>
          <CardDescription>Define template details and submit for approval</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tname">Template Name (WhatsApp)</Label>
                <Input id="tname" placeholder="order_update_1" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
                <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and underscores only</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fname">Friendly Name</Label>
                <Input id="fname" placeholder="Order update template" value={friendlyName} onChange={(e) => setFriendlyName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English (en)</SelectItem>
                    <SelectItem value="en_US">English US (en_US)</SelectItem>
                    <SelectItem value="hi">Hindi (hi)</SelectItem>
                    <SelectItem value="es">Spanish (es)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTILITY">Utility</SelectItem>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="media">Media URL (optional)</Label>
                <Input id="media" placeholder="https://.../image.jpg" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
                <p className="text-xs text-muted-foreground">Leave blank for a text-only template</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hello {{1}}, your order {{2}} is ready." />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{body.length}/1024 characters</span>
                <span>
                  Variables detected: <Badge variant="secondary">{variablesInBody}</Badge>
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer">Footer (optional)</Label>
              <Input id="footer" value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="e.g., Reply STOP to unsubscribe" />
            </div>

            <Button type="submit" className="w-full" disabled={!isValid() || isSubmitting}>
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? "Submitting..." : "Submit for WhatsApp approval"}
            </Button>
          </form>

          {result && (
            <div className="mt-6 space-y-3">
              {result.success ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Submitted. ContentSid: {result.contentSid}. Status: {status || result.status || 'submitted'}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {result.error || "Submission failed"}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
