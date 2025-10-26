/**
 * API utilities for safe response handling and debugging
 * Solves "Unexpected token '<'" errors when HTML is returned instead of JSON
 */

export interface ApiError extends Error {
  status?: number;
  response?: string;
  contentType?: string;
}

/**
 * Safely parses JSON response, checking content type first
 */
export async function safeJsonResponse<T = any>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  
  // Check if response is HTML (error page)
  if (contentType.includes('text/html')) {
    const htmlText = await response.text();
    
    // Create detailed error with debugging info
    const error = new Error(
      `Server returned HTML instead of JSON. This usually means:\n` +
      `1. API endpoint doesn't exist (${response.url})\n` +
      `2. Server error (status: ${response.status})\n` +
      `3. Incorrect Content-Type header\n\n` +
      `Response preview: ${htmlText.substring(0, 200)}...`
    ) as ApiError;
    
    error.status = response.status;
    error.response = htmlText;
    error.contentType = contentType;
    
    throw error;
  }
  
  // Check if response is actually JSON
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    
    const error = new Error(
      `Expected JSON response but got ${contentType}.\n` +
      `Response: ${text.substring(0, 200)}...`
    ) as ApiError;
    
    error.status = response.status;
    error.response = text;
    error.contentType = contentType;
    
    throw error;
  }
  
  try {
    return await response.json();
  } catch (parseError: unknown) {
    const text = await response.text();
    const msg = parseError instanceof Error ? parseError.message : String(parseError);
    
    const error = new Error(
      `Failed to parse JSON response: ${msg}\n` +
      `Raw response: ${text.substring(0, 200)}...`
    ) as ApiError;
    
    error.status = response.status;
    error.response = text;
    error.contentType = contentType;
    
    throw error;
  }
}

/**
 * Enhanced fetch wrapper with better error handling
 */
export async function safeFetch<T = any>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
    });
    
    // Check for HTTP errors first
    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await safeJsonResponse(response.clone());
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If JSON parsing fails, try to get text
        try {
          const errorText = await response.text();
          if (errorText && !errorText.includes('<html')) {
            errorMessage = errorText;
          }
        } catch {
          // Use the original error message
        }
      }
      
      const error = new Error(errorMessage) as ApiError;
      error.status = response.status;
      throw error;
    }
    
    // Parse successful response
    return await safeJsonResponse<T>(response);
    
  } catch (error) {
    // Network or other fetch errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error: Unable to connect to ${url}. ` +
        `Check if the server is running and the URL is correct.`
      );
    }
    
    // Re-throw our custom errors
    throw error;
  }
}

/**
 * Debug utility to log response details
 */
export async function debugResponse(response: Response): Promise<void> {
  const cloned = response.clone();
  
  console.group('🔍 API Response Debug');
  console.log('URL:', response.url);
  console.log('Status:', response.status, response.statusText);
  console.log('Headers:', Object.fromEntries(response.headers.entries()));
  
  const contentType = response.headers.get('content-type') || '';
  console.log('Content-Type:', contentType);
  
  try {
    const text = await cloned.text();
    
    if (contentType.includes('application/json')) {
      try {
        const json = JSON.parse(text);
        console.log('JSON Response:', json);
      } catch {
        console.log('Invalid JSON Response:', text.substring(0, 500));
      }
    } else {
      console.log('Text Response:', text.substring(0, 500));
      
      if (text.includes('<html')) {
        console.warn('⚠️ Server returned HTML instead of JSON!');
        console.log('This usually indicates:');
        console.log('1. API endpoint does not exist');
        console.log('2. Server error (check server logs)');
        console.log('3. Incorrect routing configuration');
      }
    }
  } catch (error) {
    console.error('Failed to read response:', error);
  }
  
  console.groupEnd();
}

/**
 * Validates API endpoint exists by checking response
 */
export async function validateEndpoint(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      credentials: 'include'
    });
    
    // Endpoint exists if it doesn't return HTML error page
    const contentType = response.headers.get('content-type') || '';
    return !contentType.includes('text/html') || response.ok;
    
  } catch {
    return false;
  }
}

/**
 * Quick diagnostic tool for API issues
 */
export async function diagnoseApiIssue(url: string): Promise<void> {
  console.group('🏥 API Diagnostic Tool');
  
  try {
    console.log('Testing endpoint:', url);
    
    const isValid = await validateEndpoint(url);
    console.log('Endpoint exists:', isValid);
    
    if (!isValid) {
      console.warn('❌ Endpoint appears to be invalid or returning HTML');
      console.log('Common solutions:');
      console.log('1. Check server is running');
      console.log('2. Verify API route exists in server code');
      console.log('3. Check for typos in endpoint URL');
      console.log('4. Review server logs for errors');
    }
    
  } catch (error) {
    console.error('Diagnostic failed:', error);
  }
  
  console.groupEnd();
}