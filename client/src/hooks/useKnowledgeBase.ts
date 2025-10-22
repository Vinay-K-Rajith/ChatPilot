import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { safeJsonResponse } from '../utils/api';
import type { 
  KnowledgeDocument, 
  KnowledgeQuery, 
  CreateArticleData, 
  UpdateArticleData,
  CreateLegacyArticleData,
  UpdateLegacyArticleData
} from '../../../shared/knowledge';

// API Functions for Articles (GMT_KB)
async function fetchArticles(query: { search?: string; category?: string; page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (query.search) params.append('q', query.search);
  if (query.category) params.append('category', query.category);
  if (query.page) params.append('page', query.page.toString());
  if (query.limit) params.append('limit', query.limit.toString());

  const response = await fetch(`/api/knowledge-base/articles?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch articles');
  }
  return safeJsonResponse(response);
}

// API Functions for PDFs (GMT_KB_v2) - Currently not implemented in backend
async function fetchPDFs(query: { search?: string; category?: string; page?: number; limit?: number }) {
  // Return empty result since PDF storage is not implemented
  // PDFs are processed for text extraction only via /api/knowledge-base/extract-pdf
  return {
    documents: [],
    total: 0,
    page: query.page || 1,
    limit: query.limit || 20,
    totalPages: 0
  };
}

// Backward compatibility function
async function fetchKnowledgeDocuments(query: KnowledgeQuery) {
  if (query.type === 'article') {
    return fetchArticles(query);
  } else if (query.type === 'pdf') {
    return fetchPDFs(query);
  } else {
    // Return both if no type specified
    const [articles, pdfs] = await Promise.all([
      fetchArticles(query),
      fetchPDFs(query)
    ]);
    
    return {
      articles: articles.articles || [],
      documents: pdfs.documents || [],
      totalArticles: articles.total || 0,
      totalPDFs: pdfs.total || 0
    };
  }
}

async function fetchKnowledgeDocument(id: string): Promise<KnowledgeDocument> {
  const response = await fetch(`/api/knowledge-base/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch knowledge document');
  }
  return safeJsonResponse(response);
}

async function createArticle(data: CreateLegacyArticleData): Promise<any> {
  const response = await fetch('/api/knowledge-base/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await safeJsonResponse(response);
    throw new Error(error.error || 'Failed to create article');
  }
  return safeJsonResponse(response);
}

async function updateArticle(id: string, data: UpdateLegacyArticleData): Promise<any> {
  const response = await fetch(`/api/knowledge-base/articles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await safeJsonResponse(response);
    throw new Error(error.error || 'Failed to update article');
  }
  return safeJsonResponse(response);
}

async function updatePDF(id: string, data: { title?: string; category?: string }): Promise<any> {
  const response = await fetch(`/api/knowledge-base/pdfs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await safeJsonResponse(response);
    throw new Error(error.error || 'Failed to update PDF');
  }
  return safeJsonResponse(response);
}

// Backward compatibility function
async function updateKnowledgeDocument(id: string, data: any): Promise<any> {
  const response = await fetch(`/api/knowledge-base/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await safeJsonResponse(response);
    throw new Error(error.error || 'Failed to update document');
  }
  return safeJsonResponse(response);
}

async function deleteKnowledgeDocument(id: string): Promise<void> {
  const response = await fetch(`/api/knowledge-base/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await safeJsonResponse(response);
    throw new Error(error.error || 'Failed to delete document');
  }
}

async function uploadPDF(file: File, category?: string, title?: string): Promise<KnowledgeDocument> {
  const formData = new FormData();
  formData.append('file', file);
  if (category) formData.append('category', category);
  if (title) formData.append('title', title);

  const response = await fetch('/api/knowledge-base/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await safeJsonResponse(response);
    throw new Error(error.error || 'Failed to upload PDF');
  }
  
  return safeJsonResponse(response);
}

// New Custom Hooks for separate collections
export function useArticles(query: { search?: string; category?: string; page?: number; limit?: number } = {}) {
  const normalizedQuery = {
    page: 1,
    limit: 20,
    ...query,
  };
  
  return useQuery({
    queryKey: ['articles', normalizedQuery],
    queryFn: () => fetchArticles(normalizedQuery),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePDFs(query: { search?: string; category?: string; page?: number; limit?: number } = {}) {
  const normalizedQuery = {
    page: 1,
    limit: 20,
    ...query,
  };
  
  return useQuery({
    queryKey: ['pdfs', normalizedQuery],
    queryFn: () => fetchPDFs(normalizedQuery),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Backward compatibility hook
export function useKnowledgeDocuments(query: Partial<KnowledgeQuery> = {}) {
  const normalizedQuery: KnowledgeQuery = {
    page: 1,
    limit: 20,
    ...query,
  };
  
  return useQuery({
    queryKey: ['knowledge-documents', normalizedQuery],
    queryFn: () => fetchKnowledgeDocuments(normalizedQuery),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useKnowledgeDocument(id: string) {
  return useQuery({
    queryKey: ['knowledge-document', id],
    queryFn: () => fetchKnowledgeDocument(id),
    enabled: !!id,
  });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createArticle,
    onSuccess: () => {
      // Invalidate and refetch articles and combined knowledge documents
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
    },
  });
}

export function useUpdateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLegacyArticleData }) => 
      updateArticle(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
    },
  });
}

export function useUpdatePDF() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; category?: string } }) => 
      updatePDF(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['pdfs'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
    },
  });
}

// Backward compatibility hook
export function useUpdateKnowledgeDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      updateKnowledgeDocument(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate and refetch all
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['pdfs'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-document', id] });
    },
  });
}

export function useDeleteKnowledgeDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteKnowledgeDocument,
    onSuccess: () => {
      // Invalidate and refetch all collections
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['pdfs'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
    },
  });
}

export function useUploadPDF() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, category, title }: { file: File; category?: string; title?: string }) =>
      uploadPDF(file, category, title),
    onSuccess: () => {
      // Invalidate and refetch PDFs and combined knowledge documents
      queryClient.invalidateQueries({ queryKey: ['pdfs'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
    },
  });
}
