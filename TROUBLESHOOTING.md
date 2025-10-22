# Troubleshooting "Unexpected token '<'" Error

## What This Error Means

The "Unexpected token '<'" error occurs when your JavaScript code expects JSON but receives HTML instead. This typically happens when:

1. **API endpoint doesn't exist** - Server returns a 404 HTML error page
2. **Server error** - Server crashes and returns an HTML error page
3. **Authentication issues** - Server redirects to a login page (HTML)
4. **Wrong Content-Type** - Server returns HTML with wrong headers

## Quick Diagnosis

### Step 1: Check Your Browser Console
1. Open Developer Tools (F12)
2. Go to the Network tab
3. Reproduce the error
4. Look for failed API calls (red status codes)
5. Click on the failed request and check the Response tab

### Step 2: Use the Debug Component (Development Only)
```typescript
// Add to your component temporarily:
import { ApiDebugger } from './components/ApiDebugger';

// In your JSX:
{process.env.NODE_ENV === 'development' && <ApiDebugger />}
```

### Step 3: Manual Testing
```bash
# Test if your API endpoint exists:
curl -I http://localhost:5000/api/leads

# Or test with full request:
curl -X GET http://localhost:5000/api/leads -H "Content-Type: application/json"
```

## Common Solutions

### 1. Server Not Running
**Problem**: API server is not started
**Solution**: Start your server
```bash
cd server
npm run dev
# or
npm start
```

### 2. Wrong API URL
**Problem**: Endpoint URL is incorrect
```typescript
// Wrong:
fetch('/api/lead')  // Missing 's'

// Correct:
fetch('/api/leads')
```

### 3. Server Route Missing
**Problem**: Route not defined in server
**Check**: Look in your server routes file for the endpoint
```typescript
// Make sure this exists in your server:
app.get('/api/leads', (req, res) => {
  // handler code
});
```

### 4. CORS Issues
**Problem**: Cross-origin request blocked
**Solution**: Configure CORS in your server
```typescript
import cors from 'cors';
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### 5. Environment/Port Issues
**Problem**: API running on different port
**Check**: Your API base URL configuration
```typescript
// In development, ensure proxy is set up correctly in vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
});
```

## Updated Code Fixes

The following files have been updated with safe JSON parsing:

### ✅ Fixed Files:
- `client/src/hooks/useKnowledgeBase.ts`
- `client/src/hooks/useCampaigns.ts`
- `client/src/hooks/useLeads.ts`

### New Utilities:
- `client/src/utils/api.ts` - Safe JSON parsing utilities
- `client/src/components/ApiDebugger.tsx` - Debug component

## Safe API Calls Pattern

Instead of:
```typescript
const response = await fetch('/api/endpoint');
return response.json(); // ❌ Can cause "Unexpected token '<'"
```

Use:
```typescript
import { safeJsonResponse } from '../utils/api';

const response = await fetch('/api/endpoint');
if (!response.ok) {
  throw new Error('API request failed');
}
return safeJsonResponse(response); // ✅ Safe parsing with better errors
```

Or use the complete wrapper:
```typescript
import { safeFetch } from '../utils/api';

const data = await safeFetch('/api/endpoint'); // ✅ Handles everything
```

## Error Messages You'll Now See

Instead of cryptic "Unexpected token '<'", you'll get helpful messages like:

```
Server returned HTML instead of JSON. This usually means:
1. API endpoint doesn't exist (/api/nonexistent)
2. Server error (status: 500)
3. Incorrect Content-Type header

Response preview: <!DOCTYPE html><html><head><title>Error</title></head>...
```

## Prevention Checklist

Before deploying:
- [ ] All API endpoints are properly defined
- [ ] Server is running and accessible
- [ ] CORS is configured correctly
- [ ] Environment variables are set
- [ ] Proxy configuration is correct
- [ ] All fetch calls use safe JSON parsing

## Development Workflow

1. **Start server first**: Always ensure your API server is running
2. **Check network tab**: Monitor API calls in browser dev tools
3. **Use debug component**: Add `<ApiDebugger />` temporarily when debugging
4. **Test endpoints**: Use curl or Postman to verify endpoints work
5. **Remove debug code**: Remove debug components before committing

## Still Having Issues?

1. Check server logs for errors
2. Verify your API routes are correctly registered
3. Test endpoints with curl/Postman independently
4. Use the browser Network tab to see actual responses
5. Enable debug logging in your API responses

The updated code now provides much better error messages to help you identify exactly what's going wrong!