import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { safeJsonResponse } from '../utils/api';
import type {
  Campaign,
  CreateCampaignData,
  UpdateCampaignData,
  CampaignFilters,
  CampaignPagination,
  CampaignStats,
} from "../../../shared/models/campaign";

// API base URL
const API_BASE = "/api";

// API functions
const campaignApi = {
  // Get campaigns with filters and pagination
  getCampaigns: async (filters: CampaignFilters = {}, pagination: Partial<CampaignPagination> = {}): Promise<{
    campaigns: Campaign[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const params = new URLSearchParams();
    
    if (pagination.page) params.append("page", pagination.page.toString());
    if (pagination.limit) params.append("limit", pagination.limit.toString());
    if (pagination.sortBy) params.append("sortBy", pagination.sortBy);
    if (pagination.sortOrder) params.append("sortOrder", pagination.sortOrder);
    
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        filters.status.forEach(s => params.append("status", s));
      } else {
        params.append("status", filters.status);
      }
    }
    
    if (filters.type) {
      if (Array.isArray(filters.type)) {
        filters.type.forEach(t => params.append("type", t));
      } else {
        params.append("type", filters.type);
      }
    }
    
    if (filters.search) params.append("search", filters.search);
    if (filters.createdBy) params.append("createdBy", filters.createdBy);
    if (filters.dateRange?.start) params.append("dateStart", filters.dateRange.start.toISOString());
    if (filters.dateRange?.end) params.append("dateEnd", filters.dateRange.end.toISOString());
    
    const response = await fetch(`${API_BASE}/campaigns?${params}`);
    if (!response.ok) throw new Error("Failed to fetch campaigns");
    return safeJsonResponse(response);
  },

  // Get single campaign
  getCampaign: async (id: string): Promise<Campaign> => {
    const response = await fetch(`${API_BASE}/campaigns/${id}`);
    if (!response.ok) throw new Error("Failed to fetch campaign");
    return safeJsonResponse(response);
  },

  // Create campaign
  createCampaign: async (data: CreateCampaignData): Promise<Campaign> => {
    const response = await fetch(`${API_BASE}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await safeJsonResponse(response);
      throw new Error(error.error || "Failed to create campaign");
    }
    return safeJsonResponse(response);
  },

  // Update campaign
  updateCampaign: async (id: string, data: UpdateCampaignData): Promise<Campaign> => {
    const response = await fetch(`${API_BASE}/campaigns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await safeJsonResponse(response);
      throw new Error(error.error || "Failed to update campaign");
    }
    return safeJsonResponse(response);
  },

  // Delete campaign
  deleteCampaign: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/campaigns/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete campaign");
  },

  // Pause campaign
  pauseCampaign: async (id: string): Promise<Campaign> => {
    const response = await fetch(`${API_BASE}/campaigns/${id}/pause`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to pause campaign");
    return safeJsonResponse(response);
  },

  // Resume campaign
  resumeCampaign: async (id: string): Promise<Campaign> => {
    const response = await fetch(`${API_BASE}/campaigns/${id}/resume`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to resume campaign");
    return safeJsonResponse(response);
  },

  // Send campaign now
  sendCampaignNow: async (id: string): Promise<Campaign> => {
    const response = await fetch(`${API_BASE}/campaigns/${id}/send-now`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to send campaign");
    return safeJsonResponse(response);
  },

  // Get campaign statistics
  getCampaignStats: async (): Promise<CampaignStats> => {
    const response = await fetch(`${API_BASE}/campaigns-stats`);
    if (!response.ok) throw new Error("Failed to fetch campaign stats");
    return safeJsonResponse(response);
  },

  // Upload media file
  uploadMedia: async (file: File): Promise<{
    url: string;
    filename: string;
    originalName: string;
    size: number;
    mimetype: string;
  }> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/campaigns/media`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await safeJsonResponse(response);
      throw new Error(error.error || "Failed to upload media");
    }

    return safeJsonResponse(response);
  },
};

// React Query hooks
export function useCampaigns(filters?: CampaignFilters, pagination?: Partial<CampaignPagination>) {
  return useQuery({
    queryKey: ["campaigns", filters, pagination],
    queryFn: () => campaignApi.getCampaigns(filters, pagination),
    staleTime: 30000, // 30 seconds
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ["campaign", id],
    queryFn: () => campaignApi.getCampaign(id),
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: campaignApi.createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns-stats"] });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCampaignData }) =>
      campaignApi.updateCampaign(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns-stats"] });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: campaignApi.deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns-stats"] });
    },
  });
}

export function usePauseCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: campaignApi.pauseCampaign,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
    },
  });
}

export function useResumeCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: campaignApi.resumeCampaign,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
    },
  });
}

export function useSendCampaignNow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: campaignApi.sendCampaignNow,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
    },
  });
}

export function useCampaignStats() {
  return useQuery({
    queryKey: ["campaigns-stats"],
    queryFn: campaignApi.getCampaignStats,
    staleTime: 60000, // 1 minute
  });
}

export function useUploadMedia() {
  return useMutation({
    mutationFn: campaignApi.uploadMedia,
  });
}

// Utility hook for common campaign operations
export function useCampaignOperations() {
  const updateMutation = useUpdateCampaign();
  const pauseMutation = usePauseCampaign();
  const resumeMutation = useResumeCampaign();
  const sendNowMutation = useSendCampaignNow();
  const deleteMutation = useDeleteCampaign();

  return {
    update: updateMutation.mutateAsync,
    pause: pauseMutation.mutateAsync,
    resume: resumeMutation.mutateAsync,
    sendNow: sendNowMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isLoading: 
      updateMutation.isPending ||
      pauseMutation.isPending ||
      resumeMutation.isPending ||
      sendNowMutation.isPending ||
      deleteMutation.isPending,
  };
}