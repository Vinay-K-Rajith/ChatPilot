import { safeFetch } from './api';

export interface TemplateStatusResponse {
  success: boolean;
  status?: string;
  error?: string;
  raw?: any;
}

export interface SyncStatusResponse {
  success: boolean;
  synced?: number;
  total?: number;
  error?: string;
}

/**
 * Fetch the live approval status of a single template from Twilio
 */
export async function fetchTemplateStatus(contentSid: string): Promise<TemplateStatusResponse> {
  try {
    return await safeFetch<TemplateStatusResponse>(
      `/api/whatsapp/templates/${contentSid}/status`
    );
  } catch (error) {
    console.error(`Failed to fetch status for ${contentSid}:`, error);
    return { success: false, error: 'Failed to fetch status' };
  }
}

/**
 * Sync all template statuses with Twilio (pulls latest from API)
 */
export async function syncAllTemplateStatuses(): Promise<SyncStatusResponse> {
  try {
    return await safeFetch<SyncStatusResponse>(
      '/api/whatsapp/templates/sync-status',
      {
        method: 'POST',
      }
    );
  } catch (error) {
    console.error('Failed to sync template statuses:', error);
    return { success: false, error: 'Failed to sync statuses' };
  }
}

/**
 * Poll a template's status until it reaches a terminal state
 */
export async function pollTemplateUntilTerminal(
  contentSid: string,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<{ status: string; attempts: number }> {
  const terminalStates = ['approved', 'rejected', 'disabled'];
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await fetchTemplateStatus(contentSid);
    
    if (result.success && result.status) {
      if (terminalStates.includes(result.status.toLowerCase())) {
        return { status: result.status, attempts: attempt + 1 };
      }
    }
    
    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  return { status: 'pending', attempts: maxAttempts };
}
