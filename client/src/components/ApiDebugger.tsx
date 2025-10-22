import React, { useState } from 'react';
import { validateEndpoint, diagnoseApiIssue, debugResponse, safeFetch } from '../utils/api';

/**
 * Debug component for troubleshooting API issues
 * Use this temporarily to diagnose "Unexpected token '<'" errors
 */
export function ApiDebugger() {
  const [url, setUrl] = useState('/api/leads');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testEndpoint = async () => {
    setIsLoading(true);
    setResult('Testing endpoint...\n');

    try {
      // First, validate if endpoint exists
      const isValid = await validateEndpoint(url);
      setResult(prev => prev + `Endpoint valid: ${isValid}\n`);

      // Try to fetch and see what we get
      const response = await fetch(url);
      setResult(prev => prev + `Status: ${response.status} ${response.statusText}\n`);
      setResult(prev => prev + `Content-Type: ${response.headers.get('content-type')}\n`);
      
      // Debug the response
      await debugResponse(response.clone());
      
      // Try safe fetch
      try {
        const data = await safeFetch(url);
        setResult(prev => prev + 'Safe fetch successful!\n');
        setResult(prev => prev + `Data preview: ${JSON.stringify(data).substring(0, 200)}...\n`);
      } catch (error) {
        setResult(prev => prev + `Safe fetch error: ${error.message}\n`);
      }

      // Run full diagnosis
      await diagnoseApiIssue(url);
      
    } catch (error) {
      setResult(prev => prev + `Error: ${error.message}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  const commonEndpoints = [
    '/api/leads',
    '/api/campaigns',
    '/api/knowledge-base/articles',
    '/api/campaigns-stats',
    '/api/health',
  ];

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '400px',
      padding: '15px',
      backgroundColor: '#f0f0f0',
      border: '1px solid #ccc',
      borderRadius: '5px',
      zIndex: 9999,
      fontSize: '12px',
      maxHeight: '60vh',
      overflowY: 'auto'
    }}>
      <h4>API Debugger</h4>
      
      <div>
        <label>Test URL:</label>
        <select 
          value={url} 
          onChange={e => setUrl(e.target.value)}
          style={{ width: '100%', margin: '5px 0' }}
        >
          {commonEndpoints.map(endpoint => (
            <option key={endpoint} value={endpoint}>{endpoint}</option>
          ))}
        </select>
        <input 
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          style={{ width: '100%', margin: '5px 0' }}
          placeholder="Or enter custom URL"
        />
      </div>

      <button 
        onClick={testEndpoint}
        disabled={isLoading}
        style={{
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Testing...' : 'Test Endpoint'}
      </button>

      {result && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          fontSize: '11px'
        }}>
          {result}
        </div>
      )}

      <div style={{ marginTop: '10px', fontSize: '10px', color: '#666' }}>
        <strong>Usage:</strong> Remove this component from production! 
        It's only for debugging API issues.
      </div>
    </div>
  );
}