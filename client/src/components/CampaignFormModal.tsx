import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar,
  Clock,
  Upload,
  X,
  Plus,
  Users,
  FileText,
  Send,
  Loader2,
  Image,
  Video,
  File,
  Eye,
  Mail,
  Phone
} from "lucide-react";
import { 
  useCreateCampaign, 
  useUpdateCampaign, 
  useUploadMedia 
} from "@/hooks/useCampaigns";
import { useLeadsByIds } from "@/hooks/useLeads";
import type { Campaign, CreateCampaignData } from "../../../shared/models/campaign";
import { extractVariables, processTemplate } from "../../../shared/models/campaign";
import LeadSelector from "./LeadSelector";
import { safeFetch } from "@/utils/api";

// Form validation schema
const campaignFormSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(100, "Name too long"),
  type: z.enum(["broadcast", "drip", "trigger"]),
  template: z.string().min(1, "Template preview is required"),
  templateContentSid: z.string().min(1, "Please select an approved WhatsApp template"),
  variables: z.record(z.string()).default({}),
  variableBindings: z.record(z.string()).default({}),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(["image", "video", "document"]).optional(),
  leadIds: z.array(z.string()).default([]),
  scheduleType: z.enum(["immediate", "scheduled", "recurring"]),
  scheduledAt: z.string().optional(),
  timezone: z.string().default("UTC"),
  recurringPattern: z.object({
    frequency: z.enum(["daily", "weekly", "monthly"]),
    interval: z.number().min(1),
    endDate: z.string().optional(),
  }).optional(),
  createdBy: z.string().default("user"),
});

type CampaignFormData = z.infer<typeof campaignFormSchema>;

interface CampaignFormModalProps {
  open: boolean;
  onClose: () => void;
  campaign?: Campaign | null;
  onSuccess?: (campaign: Campaign) => void;
}

// Common template variables
const TEMPLATE_VARIABLES = [
  { key: "name", label: "Lead Name", example: "John Doe" },
  { key: "email", label: "Email Address", example: "john@example.com" },
  { key: "phone", label: "Phone Number", example: "+1234567890" },
  { key: "company", label: "Company Name", example: "Acme Corp" },
];

// Timezone options (subset of common ones)
const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Asia/Kolkata", label: "India" },
];

export default function CampaignFormModal({ 
  open, 
  onClose, 
  campaign, 
  onSuccess 
}: CampaignFormModalProps) {
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState("basic");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [leadSelectorOpen, setLeadSelectorOpen] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [templates, setTemplates] = useState<Array<{ contentSid: string; name: string; friendlyName?: string; body?: string; variables?: Record<string,string>; status?: string; mediaUrl?: string }>>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Mutations
  const createCampaignMutation = useCreateCampaign();
  const updateCampaignMutation = useUpdateCampaign();
  const uploadMediaMutation = useUploadMedia();
  
  // Fetch leads by IDs for editing mode
  const { data: leadsForEdit } = useLeadsByIds(
    campaign?.leadIds || []
  );

  // Form setup
  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      type: "broadcast",
      template: "",
      variables: {},
      variableBindings: {},
      leadIds: [],
      scheduleType: "immediate",
      timezone: "UTC",
      createdBy: "user", // TODO: Get from auth context
    },
  });

// Load approved WhatsApp templates when the modal opens
  useEffect(() => {
    let cancelled = false;
    async function loadTemplates() {
      try {
        setLoadingTemplates(true);
        const res = await safeFetch<{ success: boolean; templates: any[] }>(`/api/whatsapp/templates`);
        const approved = (res.templates || []).filter((t: any) => (t.status || '').toLowerCase() === 'approved');
        if (!cancelled) setTemplates(approved);
      } catch (e) {
        console.error('Failed to fetch templates', e);
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    }
    if (open) loadTemplates();
    return () => { cancelled = true; };
  }, [open]);

  // Load campaign data for editing
  useEffect(() => {
    if (campaign && open) {
      form.reset({
        name: campaign.name,
        type: campaign.type,
        template: campaign.template,
        templateContentSid: (campaign as any).templateContentSid || "",
        variables: campaign.variables || {},
        variableBindings: (campaign as any).variableBindings || {},
        mediaUrl: campaign.mediaUrl,
        mediaType: campaign.mediaType,
        leadIds: campaign.leadIds || [],
        scheduleType: campaign.scheduleType,
        scheduledAt: campaign.scheduledAt ? 
          (() => {
            const date = campaign.scheduledAt;
            if (date instanceof Date) {
              return date.toISOString().slice(0, 16);
            } else if (typeof date === 'string') {
              return (date as string).slice(0, 16);
            }
            return undefined;
          })() : undefined,
        timezone: campaign.timezone,
        recurringPattern: campaign.recurringPattern ? {
          frequency: campaign.recurringPattern.frequency,
          interval: campaign.recurringPattern.interval,
          endDate: campaign.recurringPattern.endDate ? 
            (() => {
              const date = campaign.recurringPattern.endDate;
              if (date instanceof Date) {
                return date.toISOString().slice(0, 16);
              } else if (typeof date === 'string') {
                return (date as string).slice(0, 16);
              }
              return undefined;
            })() : undefined,
        } : undefined,
        createdBy: campaign.createdBy || "user",
      });
      
      if (campaign.mediaUrl) {
        setMediaPreview(campaign.mediaUrl);
      }
      
      // Populate selected leads for editing
      if (leadsForEdit && leadsForEdit.length > 0) {
        setSelectedLeads(leadsForEdit);
      }
    } else if (open) {
      // Reset form for new campaign
      form.reset({
        name: "",
        type: "broadcast",
        template: "",
        templateContentSid: "",
        variables: {},
        variableBindings: {},
        leadIds: [],
        scheduleType: "immediate",
        timezone: "UTC",
        createdBy: "user",
      });
      setSelectedFile(null);
      setMediaPreview(null);
      setSelectedLeads([]);
      setCurrentTab("basic");
    }
  }, [campaign, open, form, leadsForEdit]);

  // Extract and update template variables
  const template = form.watch("template");
  const variables = form.watch("variables");
  const variableBindings = form.watch("variableBindings");
  const templateContentSid = form.watch("templateContentSid");
  
  useEffect(() => {
    if (template) {
      const extractedVars = extractVariables(template);
      const currentVars = variables || {};
      const newVars: Record<string, string> = {};
      
      extractedVars.forEach(varName => {
        newVars[varName] = currentVars[varName] || getDefaultValue(varName);
      });
      
      if (JSON.stringify(newVars) !== JSON.stringify(currentVars)) {
        form.setValue("variables", newVars);
      }
      
      // Initialize bindings for any new variables (default empty)
      const currBindings = variableBindings || {};
      const nextBindings: Record<string,string> = { ...currBindings };
      extractedVars.forEach(v => { if (!(v in nextBindings)) nextBindings[v] = currBindings[v] || ""; });
      if (JSON.stringify(nextBindings) !== JSON.stringify(currBindings)) {
        form.setValue("variableBindings", nextBindings);
      }
    }
  }, [template, variables, form]);

  const getDefaultValue = (varName: string): string => {
    const templateVar = TEMPLATE_VARIABLES.find(tv => tv.key === varName);
    return templateVar?.example || `Sample ${varName}`;
  };

  // File upload handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setMediaPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setMediaPreview(null);
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setMediaPreview(null);
    form.setValue("mediaUrl", undefined);
    form.setValue("mediaType", undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Insert template variable at cursor position
  const insertVariable = (varName: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = form.getValues("template");
      const newValue = currentValue.slice(0, start) + `{{${varName}}}` + currentValue.slice(end);
      
      form.setValue("template", newValue);
      
      // Focus back to textarea and set cursor position
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + `{{${varName}}}`.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  // Form submission
  const onSubmit = async (data: CampaignFormData) => {
    try {
      console.log('Form submission data:', data);
      console.log('Form leadIds:', data.leadIds);
      console.log('Selected leads state:', selectedLeads);
      
      // Validate that at least one lead is selected
      if (data.leadIds.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please select at least one recipient for this campaign.",
          variant: "destructive",
        });
        setCurrentTab("leads");
        return;
      }
      let mediaUrl = data.mediaUrl;
      let mediaType = data.mediaType;

      // Upload file if selected
      if (selectedFile) {
        const uploadResult = await uploadMediaMutation.mutateAsync(selectedFile);
        mediaUrl = uploadResult.url;
        
        if (selectedFile.type.startsWith('image/')) {
          mediaType = 'image';
        } else if (selectedFile.type.startsWith('video/')) {
          mediaType = 'video';
        } else {
          mediaType = 'document';
        }
      } else if (campaign?.mediaUrl && !selectedFile) {
        // Keep existing media if no new file is selected
        mediaUrl = campaign.mediaUrl;
        mediaType = campaign.mediaType;
      }

      const campaignData: CreateCampaignData = {
        ...data,
        mediaUrl,
        mediaType,
      };

      let result: Campaign;
      if (campaign?._id) {
        result = await updateCampaignMutation.mutateAsync({
          id: campaign._id,
          data: campaignData,
        });
      } else {
        result = await createCampaignMutation.mutateAsync(campaignData);
      }

      toast({
        title: campaign ? "Campaign Updated" : "Campaign Created",
        description: `${result.name} has been ${campaign ? "updated" : "created"} successfully.`,
      });

      onSuccess?.(result);
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${campaign ? "update" : "create"} campaign`,
        variant: "destructive",
      });
    }
  };

  const isLoading = createCampaignMutation.isPending || 
                   updateCampaignMutation.isPending || 
                   uploadMediaMutation.isPending;

  // Generate preview text
  const previewText = template ? processTemplate(template, variables || {}) : "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {campaign ? "Edit Campaign" : "Create New Campaign"}
          </DialogTitle>
          <DialogDescription>
            {campaign 
              ? "Update your campaign details and settings."
              : "Create a new WhatsApp campaign to reach your leads."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="message">Message</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="leads">Recipients</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[500px] mt-4">
                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campaign Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter campaign name..." 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campaign Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="broadcast">Broadcast</SelectItem>
                              <SelectItem value="drip">Drip Campaign</SelectItem>
                              <SelectItem value="trigger">Trigger Campaign</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Broadcast: Send to all at once. Drip: Send in sequence. Trigger: Send based on actions.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Campaign Types</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Send className="h-4 w-4 mt-0.5 text-blue-500" />
                        <div>
                          <strong>Broadcast:</strong> Send the same message to all selected leads immediately or at a scheduled time.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 mt-0.5 text-orange-500" />
                        <div>
                          <strong>Drip:</strong> Send a series of messages over time to nurture leads progressively.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Users className="h-4 w-4 mt-0.5 text-green-500" />
                        <div>
                          <strong>Trigger:</strong> Send messages automatically when leads perform specific actions.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Message Tab */}
                <TabsContent value="message" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="templateContentSid"
                      render={({ field }) => (
                        <FormItem className="md:col-span-1">
                          <FormLabel>Approved WhatsApp Template</FormLabel>
                          <Select value={field.value} onValueChange={(val) => {
                            field.onChange(val);
                            const t = templates.find(x => x.contentSid === val);
                            if (t) {
                              form.setValue('template', t.body || '');
                              const vars = t.variables || {};
                              const extracted = extractVariables(t.body || '');
                              const merged: Record<string,string> = {};
                              extracted.forEach(k => { merged[k] = (vars as any)[k] || getDefaultValue(k); });
                              form.setValue('variables', merged);
                              // initialize empty bindings for extracted keys
                              const bindingsInit: Record<string,string> = {};
                              extracted.forEach(k => { bindingsInit[k] = ((form.getValues('variableBindings') || {}) as any)[k] || ""; });
                              form.setValue('variableBindings', bindingsInit);
                              if (t.mediaUrl) form.setValue('mediaUrl', t.mediaUrl);
                            }
                          }}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={loadingTemplates ? 'Loading templates...' : 'Select approved template'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {templates.map((t) => (
                                <SelectItem key={t.contentSid} value={t.contentSid}>
                                  {(t.friendlyName || t.name)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Only approved templates can be used for campaigns.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="template"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Template Preview</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Select a template to see the preview"
                              className="min-h-[150px]"
                              {...field}
                              readOnly
                              ref={(e) => {
                                if (textareaRef) {
                                  (textareaRef as any).current = e;
                                }
                                if (field.ref) field.ref(e);
                              }}
                            />
                          </FormControl>
                          <FormDescription>Variables will be filled from lead data. Adjust sample values below for preview.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Quick Insert Variables */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quick Insert Variables:</label>
                    <div className="flex flex-wrap gap-2">
                      {TEMPLATE_VARIABLES.map((templateVar) => (
                        <Button
                          key={templateVar.key}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => insertVariable(templateVar.key)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {templateVar.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Variables configuration */}
                  {Object.keys(variables || {}).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Variable Values</CardTitle>
                        <CardDescription>
                          Sample values for preview (actual send uses each lead's details)
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {Object.entries(variables || {}).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-1 md:grid-cols-3 items-center gap-3">
                            <div className="flex items-center gap-3 md:col-span-1">
                              <Badge variant="outline" className="min-w-[80px]">{`{{${key}}}`}</Badge>
                              <Input
                                value={value}
                                onChange={(e) => {
                                  const newVars = { ...(variables || {}) } as Record<string,string>;
                                  newVars[key] = e.target.value;
                                  form.setValue('variables', newVars);
                                }}
                                placeholder={`Sample for {{${key}}}`}
                                className="flex-1"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <div className="text-xs text-muted-foreground mb-1">Bind to lead field</div>
                              <Select value={(variableBindings || {})[key] || ""} onValueChange={(val) => {
                                const next = { ...(variableBindings || {}) } as Record<string,string>;
                                next[key] = val;
                                form.setValue('variableBindings', next);
                              }}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select lead field" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="name">Lead Name</SelectItem>
                                  <SelectItem value="email">Email Address</SelectItem>
                                  <SelectItem value="phone">Phone Number</SelectItem>
                                  <SelectItem value="company">Company Name</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Message Preview */}
                  {previewText && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Preview
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                          {previewText}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Media Tab */}
                <TabsContent value="media" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Media Attachment (Optional)
                      </label>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add an image, video, or document to your message. Max size: 15MB.
                      </p>
                    </div>

                    {!selectedFile && !mediaPreview ? (
                      <Card className="border-dashed border-2 hover:bg-muted/25 transition-colors">
                        <CardContent className="flex flex-col items-center justify-center py-8">
                          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                          <div className="text-center">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              Choose File
                            </Button>
                            <p className="text-sm text-muted-foreground mt-2">
                              Supports images, videos, and documents
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              {/* Icon based on file type or media type */}
                              {(selectedFile?.type.startsWith('image/') || campaign?.mediaType === 'image') ? (
                                <Image className="h-8 w-8 text-blue-500" />
                              ) : (selectedFile?.type.startsWith('video/') || campaign?.mediaType === 'video') ? (
                                <Video className="h-8 w-8 text-purple-500" />
                              ) : (
                                <File className="h-8 w-8 text-gray-500" />
                              )}
                              <div>
                                <p className="font-medium">
                                  {selectedFile?.name || (campaign?.mediaUrl ? "Current media file" : "Media file")}
                                </p>
                                {selectedFile && (
                                  <p className="text-sm text-muted-foreground">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                )}
                                {!selectedFile && campaign?.mediaUrl && (
                                  <p className="text-sm text-muted-foreground">
                                    {campaign.mediaType?.toUpperCase()} • View/Replace
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {/* View existing media button */}
                              {!selectedFile && campaign?.mediaUrl && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(campaign.mediaUrl, '_blank')}
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </Button>
                              )}
                              {/* Replace file button */}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                              >
                                Replace
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleRemoveFile}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Preview for new images */}
                          {mediaPreview && selectedFile?.type.startsWith('image/') && (
                            <div className="mt-4">
                              <img
                                src={mediaPreview}
                                alt="Preview"
                                className="max-w-full h-48 object-cover rounded-lg"
                              />
                            </div>
                          )}
                          
                          {/* Preview for existing images */}
                          {!selectedFile && campaign?.mediaUrl && campaign?.mediaType === 'image' && (
                            <div className="mt-4">
                              <img
                                src={campaign.mediaUrl}
                                alt="Current media"
                                className="max-w-full h-48 object-cover rounded-lg"
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*,.pdf,.doc,.docx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </TabsContent>

                {/* Recipients Tab */}
                <TabsContent value="leads" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Campaign Recipients</h3>
                        <p className="text-sm text-muted-foreground">
                          Select which leads will receive this campaign
                        </p>
                      </div>
                      <Button 
                        type="button" 
                        onClick={() => setLeadSelectorOpen(true)}
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {selectedLeads.length > 0 ? "Modify Selection" : "Select Recipients"}
                      </Button>
                    </div>

                    {selectedLeads.length > 0 ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Selected Recipients ({selectedLeads.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="max-h-[300px]">
                            <div className="space-y-3">
                              {selectedLeads.map((lead) => (
                                <div key={lead._id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                  <div className="flex-1">
                                    <div className="font-medium">{lead.name}</div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                                      {lead.email && (
                                        <span className="flex items-center gap-1">
                                          <Mail className="h-3 w-3" />
                                          {lead.email}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {lead.phone}
                                      </span>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className={`text-xs ${
                                    lead.status === 'active' ? 'border-green-200 text-green-700' :
                                    lead.status === 'engaged' ? 'border-blue-200 text-blue-700' :
                                    lead.status === 'new' ? 'border-yellow-200 text-yellow-700' :
                                    'border-gray-200 text-gray-700'
                                  }`}>
                                    {lead.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-dashed border-2">
                        <CardContent className="p-8 text-center">
                          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Recipients Selected</h3>
                          <p className="text-muted-foreground mb-4">
                            Choose which leads will receive this campaign message
                          </p>
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => setLeadSelectorOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Select Recipients
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* Schedule Tab */}
                <TabsContent value="schedule" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="scheduleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>When to Send</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="immediate">Send Immediately</SelectItem>
                            <SelectItem value="scheduled">Schedule for Later</SelectItem>
                            <SelectItem value="recurring">Recurring Campaign</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("scheduleType") === "scheduled" && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="scheduledAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Schedule Date & Time</FormLabel>
                            <FormControl>
                              <Input
                                type="datetime-local"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timezone</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {TIMEZONES.map((tz) => (
                                  <SelectItem key={tz.value} value={tz.value}>
                                    {tz.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {form.watch("scheduleType") === "recurring" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Recurring Schedule</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="recurringPattern.frequency"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Frequency</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="recurringPattern.interval"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Interval</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    placeholder="1"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Every X {form.watch("recurringPattern.frequency") || "days"}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="recurringPattern.endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  type="datetime-local"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Leave empty for indefinite recurrence
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <Separator />

            <DialogFooter className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentTab !== "basic" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const tabs = ["basic", "message", "media", "leads", "schedule"];
                      const currentIndex = tabs.indexOf(currentTab);
                      if (currentIndex > 0) {
                        setCurrentTab(tabs[currentIndex - 1]);
                      }
                    }}
                  >
                    Previous
                  </Button>
                )}
                
                {currentTab !== "schedule" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const tabs = ["basic", "message", "media", "leads", "schedule"];
                      const currentIndex = tabs.indexOf(currentTab);
                      if (currentIndex < tabs.length - 1) {
                        setCurrentTab(tabs[currentIndex + 1]);
                      }
                    }}
                  >
                    Next
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {campaign ? "Update Campaign" : "Create Campaign"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>

        {/* Lead Selector Modal */}
        <LeadSelector
          open={leadSelectorOpen}
          onClose={() => setLeadSelectorOpen(false)}
          selectedLeadIds={form.getValues("leadIds")}
          onSelectionChange={(leadIds) => {
            form.setValue("leadIds", leadIds);
          }}
          onConfirm={(leads) => {
            setSelectedLeads(leads);
            form.setValue("leadIds", leads.map(l => l._id));
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
