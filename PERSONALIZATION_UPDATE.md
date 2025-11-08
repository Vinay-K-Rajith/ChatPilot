# User Name Personalization Update

## Overview
Implemented natural user name incorporation in OpenAI conversations. The system now fetches user names from the leads table/collection and uses them to personalize responses.

## Changes Made

### 1. OpenAI Service (`server\services\openai.service.ts`)

#### `generateResponse()` Method
- Added `userName?: string` parameter
- Validates name format (alphabets only, 1-40 characters, allows apostrophes and hyphens)
- Adds personalized context to system prompt when valid name is provided
- Instructs AI to use name naturally and sparingly (once or twice per conversation)

#### `generateTrainingResponse()` Method
- Added `userName?: string` parameter
- Validates name format with same criteria
- Incorporates user name into training assistant responses for a warm, personalized learning experience

### 2. Twilio Service (`server\services\twilio.service.ts`)

#### `handleIncomingMessage()` Method
- Fetches lead record after name extraction
- Validates name from leads table (alphabets only)
- Passes validated name to `generateResponse()` for personalization

### 3. Routes (`server\routes.ts`)

#### `/api/chat` Endpoint (Public Chat)
- Fetches name from leads table if phone number is provided
- Falls back to user-provided name if no lead name exists
- Validates name format before passing to OpenAI service

#### `/api/training/chat` Endpoint (Training Chat)
- Fetches lead record by phone number
- Validates name format
- Passes validated name to `generateTrainingResponse()`

### 4. MongoDB Service (`server\services\mongodb.service.ts`)

#### Existing Name Validation
- `upsertLeadByPhone()` already validates names:
  - Rejects names containing digits (phone numbers)
  - Rejects empty names
  - Logs rejected invalid names

## Name Validation Rules

All name validations follow this pattern:
```typescript
/^[A-Za-z][A-Za-z'\- ]{1,40}$/.test(name)
```

**Requirements:**
- Starts with a letter
- Contains only letters, apostrophes, hyphens, and spaces
- 1-40 characters total
- No digits allowed (prevents phone numbers from being used as names)

## Behavior

### When Name is Available
- AI naturally incorporates the user's name in responses
- Usage is sparse and contextually appropriate (1-2 times per conversation)
- Creates a warm, personalized experience

### When Name is Not Available
- AI functions normally without name context
- No errors or warnings to user
- Name extraction continues in background (for WhatsApp)

## Examples

### System Prompt Addition (when name is "John"):
```
The user's name is John. Use their name naturally in your responses when appropriate to create a personalized, warm conversation. Don't overuse it—maybe once or twice per conversation in a natural way.
```

### Training Context Addition (when name is "Sarah"):
```
The user's name is Sarah. Address them by name naturally when appropriate to create a warm, personalized learning experience.
```

## Integration Points

1. **WhatsApp Messages** → Twilio Service → MongoDB (fetch lead) → OpenAI Service (with name)
2. **Web Chat** → Routes → MongoDB (fetch lead) → OpenAI Service (with name)
3. **Training Chat** → Routes → MongoDB (fetch lead) → OpenAI Service (with name)

## Testing Recommendations

1. Test with valid names (alphabets only)
2. Test with invalid names (containing digits, empty, etc.)
3. Test without name (ensure graceful degradation)
4. Test name usage in conversations (verify natural incorporation)
5. Verify name is not overused in responses

## Security & Privacy

- Names are validated server-side before use
- Invalid names are silently rejected (no error to user)
- Phone numbers cannot be used as names
- Name validation prevents injection attacks through name field
