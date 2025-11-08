import { z } from "zod";

// Campaign types
export type CampaignType = "broadcast" | "drip" | "trigger";
export type CampaignStatus = "draft" | "scheduled" | "active" | "paused" | "completed" | "sending";
export type ScheduleType = "immediate" | "scheduled" | "recurring";
export type MediaType = "image" | "video" | "document";

// Base campaign interface
export interface Campaign {
  _id?: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  
  // Message content (must be an approved WhatsApp template)
  template: string; // human-readable body preview
  templateContentSid: string; // Twilio Content SID for approved template
  variables: Record<string, string>; // Variable key (e.g., "1" or "name") -> sample value for preview
  variableBindings?: Record<string, string>; // Variable key (e.g., "1") -> lead field path (e.g., "name", "email", "lead.name")
  mediaUrl?: string;
  mediaType?: MediaType;
  
  // Targeting
  leadIds: string[]; // Array of lead IDs
  
  // Scheduling
  scheduleType: ScheduleType;
  scheduledAt?: Date;
  timezone: string;
  recurringPattern?: {
    frequency: "daily" | "weekly" | "monthly";
    interval: number;
    endDate?: Date;
  };
  
  // Stats
  targetCount: number;
  sentCount: number;
  
  // Metadata  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastSentAt?: Date;
}

// Server-side campaign interface with ObjectId
export interface ServerCampaign extends Omit<Campaign, "_id"> {
  _id?: import("mongodb").ObjectId;
}

// Validation schemas
export const CreateCampaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum(["broadcast", "drip", "trigger"]),
  template: z.string().min(1, "Template is required"),
  templateContentSid: z.string().min(1, "Approved WhatsApp template is required"),
  variables: z.record(z.string()).default({}),
  variableBindings: z.record(z.string()).optional(),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(["image", "video", "document"]).optional(),
  leadIds: z.array(z.string()).min(1, "At least one lead must be selected"),
  scheduleType: z.enum(["immediate", "scheduled", "recurring"]),
  scheduledAt: z.string().refine((val) => {
    if (!val) return true; // optional field
    // Accept both full ISO strings and HTML datetime-local format (YYYY-MM-DDTHH:MM)
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?Z?$/;
    const localDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
    return isoRegex.test(val) || localDateTimeRegex.test(val);
  }, {
    message: "Invalid datetime format. Expected ISO string or YYYY-MM-DDTHH:MM"
  }).optional(),
  timezone: z.string().default("UTC"),
  recurringPattern: z.object({
    frequency: z.enum(["daily", "weekly", "monthly"]),
    interval: z.number().min(1),
    endDate: z.string().refine((val) => {
      if (!val) return true; // optional field
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?Z?$/;
      const localDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
      return isoRegex.test(val) || localDateTimeRegex.test(val);
    }, {
      message: "Invalid datetime format. Expected ISO string or YYYY-MM-DDTHH:MM"
    }).optional(),
  }).optional(),
  createdBy: z.string(),
});

// Allow updating status and optional operational fields
export const UpdateCampaignSchema = CreateCampaignSchema.partial()
  .extend({
    status: z.enum(["draft", "scheduled", "active", "paused", "completed", "sending"]).optional(),
    // operational fields that might be set by the server when sending
    sentAt: z.any().optional(),
  })
  .omit({
    createdBy: true,
  });

export type CreateCampaignData = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaignData = z.infer<typeof UpdateCampaignSchema>;

// Campaign filters for API queries
export interface CampaignFilters {
  status?: CampaignStatus[];
  type?: CampaignType[];
  search?: string;
  createdBy?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface CampaignPagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Campaign statistics
export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  scheduledCampaigns: number;
  completedCampaigns: number;
  totalMessagesSent: number;
  averageDeliveryRate: number;
}

// Template variable extraction helper
export function extractVariables(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  
  return variables;
}

// Template processing helper
export function processTemplate(template: string, variables: Record<string, string>): string {
  let processed = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    processed = processed.replace(regex, value || `{{${key}}}`);
  }
  
  return processed;
}

export default Campaign;