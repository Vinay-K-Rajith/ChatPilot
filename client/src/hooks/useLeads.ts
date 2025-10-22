import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { safeJsonResponse } from '../utils/api';
import type { LeadWithId, CreateLead, LeadFilters, PaginationOptions, LeadsResponse, ImportResponse } from '../../../shared/models/lead';

// Query keys
const LEADS_QUERY_KEY = 'leads';

// Custom hook for fetching leads
export function useLeads(
  filters: LeadFilters = {},
  pagination: PaginationOptions = {}
) {
  const queryClient = useQueryClient();

  const query = useQuery<LeadsResponse>({
    queryKey: [LEADS_QUERY_KEY, filters, pagination],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      
      // Add pagination
      if (pagination.page) searchParams.set('page', pagination.page.toString());
      if (pagination.limit) searchParams.set('limit', pagination.limit.toString());
      if (pagination.sortBy) searchParams.set('sortBy', pagination.sortBy.toString());
      if (pagination.sortOrder) searchParams.set('sortOrder', pagination.sortOrder);

      // Add filters
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          filters.status.forEach(status => searchParams.append('status', status));
        } else {
          searchParams.set('status', filters.status);
        }
      }
      
      if (filters.search) searchParams.set('search', filters.search);
      
      if (filters.engagementScore?.min !== undefined) {
        searchParams.set('engagementMin', filters.engagementScore.min.toString());
      }
      if (filters.engagementScore?.max !== undefined) {
        searchParams.set('engagementMax', filters.engagementScore.max.toString());
      }
      
      if (filters.dateRange?.start) {
        searchParams.set('dateStart', filters.dateRange.start.toISOString());
      }
      if (filters.dateRange?.end) {
        searchParams.set('dateEnd', filters.dateRange.end.toISOString());
      }

      const response = await fetch(`/api/leads?${searchParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }
      return safeJsonResponse(response);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const invalidateLeads = () => {
    queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
  };

  return {
    ...query,
    invalidateLeads,
  };
}

// Custom hook for fetching single lead
export function useLead(id: string) {
  return useQuery<LeadWithId>({
    queryKey: [LEADS_QUERY_KEY, id],
    queryFn: async () => {
      const response = await fetch(`/api/leads/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch lead');
      }
      return safeJsonResponse(response);
    },
    enabled: !!id,
  });
}

// Custom hook for fetching multiple leads by IDs
export function useLeadsByIds(ids: string[]) {
  return useQuery<LeadWithId[]>({
    queryKey: [LEADS_QUERY_KEY, 'by-ids', ids],
    queryFn: async () => {
      if (!ids || ids.length === 0) return [];
      
      // Fetch leads with a large limit and filter by IDs
      const searchParams = new URLSearchParams();
      searchParams.set('limit', '1000'); // Large limit to get all needed leads
      
      const response = await fetch(`/api/leads?${searchParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }
      
      const data: LeadsResponse = await safeJsonResponse(response);
      // Filter to only return leads with matching IDs
      return data.leads.filter(lead => ids.includes(lead._id));
    },
    enabled: ids && ids.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Custom hook for creating leads
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadData: CreateLead) => {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        const error = await safeJsonResponse(response);
        throw new Error(error.error || 'Failed to create lead');
      }

      return safeJsonResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
    },
  });
}

// Custom hook for updating leads
export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateLead> }) => {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await safeJsonResponse(response);
        throw new Error(error.error || 'Failed to update lead');
      }

      return safeJsonResponse(response);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY, id] });
    },
  });
}

// Custom hook for deleting single lead
export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await safeJsonResponse(response);
        throw new Error(error.error || 'Failed to delete lead');
      }

      return safeJsonResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
    },
  });
}

// Custom hook for bulk deleting leads
export function useBulkDeleteLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        const error = await safeJsonResponse(response);
        throw new Error(error.error || 'Failed to delete leads');
      }

      return safeJsonResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
    },
  });
}

// Custom hook for importing leads from Excel
export function useImportLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      return new Promise<ImportResponse>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const bytes = new Uint8Array(arrayBuffer);
            const fileData = btoa(String.fromCharCode(...bytes));

            const response = await fetch('/api/leads/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                fileData, 
                fileName: file.name 
              }),
            });

            if (!response.ok) {
              const error = await safeJsonResponse(response);
              throw new Error(error.error || 'Failed to import leads');
            }

            const result = await safeJsonResponse(response);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
    },
  });
}

// Utility hooks for common operations
export function useLeadOperations() {
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const bulkDeleteLeads = useBulkDeleteLeads();
  const importLeads = useImportLeads();

  return {
    createLead,
    updateLead,
    deleteLead,
    bulkDeleteLeads,
    importLeads,
    isLoading: 
      createLead.isPending || 
      updateLead.isPending || 
      deleteLead.isPending || 
      bulkDeleteLeads.isPending ||
      importLeads.isPending,
  };
}