# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

ChatPilot is a Twilio SMS-based AI CRM system that manages customer conversations, leads, and knowledge bases. Originally a WhatsApp chatbot, it has been converted to use Twilio SMS for messaging with AI-powered responses using OpenAI.

## Architecture

### Stack
- **Backend**: Node.js with TypeScript, Express.js server
- **Frontend**: React with TypeScript, Vite for development
- **Database**: MongoDB (primary), PostgreSQL schema available via Drizzle ORM (unused)
- **AI**: OpenAI GPT-3.5-turbo with specialized industrial metal products focus
- **Messaging**: Twilio SMS API
- **UI**: Tailwind CSS, Radix UI components, shadcn/ui

### Key Services (Singleton Pattern)
- **TwilioService**: Handles SMS messaging and webhooks
- **MongoDBService**: Database operations for customers, leads, knowledge base
- **OpenAIService**: AI response generation with strict topic enforcement
- **PDFService**: PDF text extraction for knowledge base

### Database Collections
- `GMT_KB_customers` - Customer conversation history
- `GMT_KB_products` - Product catalog for promotions
- `GMT_KB` - Legacy knowledge base (articles)
- `GMT_CH` - Chat history with metadata and labels
- `GMT_Leads` - Lead management with full CRUD
- `GMT_KB_v2` - Enhanced knowledge documents (PDFs + articles)

## Development Commands

### Primary Commands
```bash
# Development (starts server on localhost:5040)
npm run dev

# Production build and start
npm run build
npm start

# Type checking
npm run check

# Database migrations
npm run db:push
npm run migrate:leads
```

### Client-Only Commands
```bash
# Build frontend widget only
npm run build:widget

# Serve built widget
npm run serve:widget
```

## Environment Configuration

Required environment variables in `.env`:
```env
# MongoDB (Primary Database)
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db>
MONGODB_DB_NAME=chatpilot

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Server Configuration
PORT=3000
NODE_ENV=development

# Optional
TWILIO_WEBHOOK_URL=https://your-domain.com/webhook/twilio
DATABASE_URL=postgresql://... # For future PostgreSQL migration
```

## Core API Endpoints

### Chat & Messaging
- `POST /api/webhook/twilio` - Twilio webhook for incoming SMS
- `POST /api/chat/preview` - Preview chat functionality (testing)
- `GET /api/chat-history/:phoneNumber` - Get conversation history
- `GET /api/chat-history` - Get recent conversations with pagination
- `PUT /api/chat-history/:phoneNumber/metadata` - Update chat metadata

### SMS Operations
- `POST /api/send-message` - Send single SMS
- `POST /api/send-bulk` - Send bulk SMS messages
- `POST /api/send-promotions` - Send scheduled promotions to inactive customers

### Lead Management (Full CRUD)
- `GET /api/leads` - List with filtering/pagination
- `POST /api/leads` - Create lead
- `GET /api/leads/:id` - Get single lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete single lead
- `DELETE /api/leads` - Bulk delete leads
- `POST /api/leads/import` - Import from Excel

### Knowledge Base (Dual System)
- `GET /api/knowledge-base` - List all knowledge (articles + PDFs)
- `POST /api/knowledge-base` - Create article
- `POST /api/knowledge-base/extract-pdf` - Extract text from PDF (no storage)
- `PUT /api/knowledge-base/:id` - Update knowledge document
- `DELETE /api/knowledge-base/:id` - Delete knowledge document

## Frontend Structure

### Pages & Routing
- `/login` - Authentication (localStorage-based)
- `/` - Dashboard
- `/conversations` - Chat history management
- `/leads` - Lead management with Excel import
- `/campaigns` - Campaign management
- `/analytics` - Analytics dashboard
- `/knowledge` - Knowledge base management (tabbed: Articles/Documents)
- `/ai-settings` - AI configuration

### Key Components
- `AppSidebar.tsx` - Main navigation sidebar
- `LeadTable.tsx` - Enhanced table with multi-select and bulk operations
- `ConversationList.tsx` - Chat conversation management
- `PreviewChat.tsx` - AI chat testing interface
- `KnowledgeBase.tsx` - Tabbed knowledge management interface
- `PdfDropzone.tsx` - Drag-and-drop PDF upload

### State Management
- React Query for API state management and caching
- Custom hooks in `/hooks/` directory (e.g., `useLeads.ts`, `useKnowledgeBase.ts`)
- Wouter for client-side routing

## AI System Details

### Response Generation
The AI is **strictly limited to industrial metal products** with server-enforced topic boundaries:
- Steel, aluminum, copper products
- Technical specifications
- Pricing and availability
- Order processing
- Industry standards

### Knowledge Integration
- MongoDB text search across articles and PDF content
- Conversation history context (last 6 messages)
- Automatic topic validation and redirect
- Post-processing to maintain focus

## Testing & Development

### Lead Management Testing
```bash
# Populate sample leads
npm run migrate:leads

# Test Excel import with these columns:
# name, phone, email, status, engagementScore
```

### API Testing Examples
```bash
# Health check
curl http://localhost:5040/api/health

# Send SMS
curl -X POST http://localhost:5040/api/send-message \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "message": "Test message"}'

# Create lead
curl -X POST http://localhost:5040/api/leads \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Lead", "phone": "+1234567890", "status": "new"}'
```

### Chat Preview Testing
Use `/api/chat/preview` endpoint with:
```json
{
  "message": "Tell me about steel products",
  "conversationHistory": [],
  "systemPrompt": "Optional custom guidance",
  "pdfContext": "Optional PDF document context"
}
```

## Database Schema & Validation

### Lead Schema (Zod Validated)
```typescript
interface Lead {
  _id: ObjectId;
  name: string;           // Required
  phone: string;          // Required, unique
  email?: string;         // Optional
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  engagementScore: number; // 0-100
  lastContactedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Knowledge Base Schema
Dual system supporting both legacy articles and new PDF documents:
```typescript
interface KnowledgeDocument {
  _id: ObjectId;
  type: "pdf" | "article";
  title: string;
  content?: string;        // For articles
  extractedText?: string;  // For PDFs
  category?: string;
  fileName?: string;       // For PDFs
  fileUrl?: string;        // For PDFs
  fileSize?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## Important Conventions

### File Paths
- `server/` - Backend Express.js application
- `client/` - Frontend React application
- `shared/` - Shared TypeScript types and schemas
- `scripts/` - Utility scripts (e.g., data migration)

### Build Configuration
- Vite build outputs to `dist/public/`
- Server builds to `dist/index.js` via esbuild
- Path aliases: `@/` → `client/src/`, `@shared/` → `shared/`

### Database Naming
- Collections prefixed with `GMT_` (e.g., `GMT_Leads`, `GMT_KB`)
- Indexes automatically created on service initialization
- Text search indexes for knowledge base content

## Key Dependencies

### Backend
- `twilio` - SMS messaging
- `openai` - AI response generation  
- `mongodb` - Database operations
- `multer` - File upload handling
- `pdf-parse` - PDF text extraction
- `xlsx` - Excel file processing

### Frontend
- `@tanstack/react-query` - API state management
- `wouter` - Lightweight routing
- `@radix-ui/*` - UI component primitives
- `react-hook-form` - Form management
- `zod` - Schema validation

## Security Considerations

- Phone numbers must be unique across leads
- All inputs validated via Zod schemas
- MongoDB parameterized queries prevent injection
- AI responses validated for topic adherence
- File uploads limited to PDF format (10MB max)
- Environment variables for all sensitive configuration

## Performance Notes

- MongoDB indexes on frequently queried fields
- React Query caching reduces API calls
- Debounced search inputs
- Pagination for large datasets
- Singleton services prevent multiple database connections
- Text search optimization for knowledge base queries