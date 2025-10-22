# ChatPilot - Twilio SMS CRM

A WhatsApp AI Chatbot CRM system that has been converted to use Twilio SMS instead of WhatsApp.

## Features

- SMS messaging via Twilio
- AI-powered responses using OpenAI
- Customer conversation tracking with MongoDB
- Bulk messaging capabilities
- Scheduled promotions
- Webhook support for incoming messages

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
MONGODB_DB_NAME=chatpilot

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token-here
TWILIO_PHONE_NUMBER=+1234567890

# Server Configuration
PORT=3000
NODE_ENV=development

# Optional: Webhook URL for Twilio
TWILIO_WEBHOOK_URL=https://your-domain.com/webhook/twilio
```

### 2. Getting Credentials

#### MongoDB Atlas
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Create a database user
4. Get your connection string from the "Connect" button
5. Replace `<username>`, `<password>`, `<cluster>`, and `<database>` in the connection string

#### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-`)

#### Twilio Credentials
1. Go to [Twilio Console](https://console.twilio.com/)
2. Get your Account SID and Auth Token from the dashboard
3. Purchase a phone number from the Phone Numbers section
4. Copy the phone number in E.164 format (e.g., +1234567890)

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
npm run dev
```

The server will start on `http://localhost:5040`

## Testing Interface

The application includes a built-in testing interface accessible through the web dashboard:

1. Start the application with `npm run dev`
2. Navigate to `http://localhost:5040` in your browser
3. Log in to access the dashboard
4. Go to Configuration > Testing tab

### Testing Features
- **Phone Number Validation**: Real-time validation for WhatsApp/SMS phone numbers
- **Message Testing**: Send test text messages to any phone number
- **Media Support**: Upload and send images, videos, documents, and audio files
- **File Validation**: Automatic validation of file types and sizes
- **Account Status**: View Twilio account information and connection status
- **Test History**: Track recent test messages with success/error status
- **Real-time Feedback**: Instant validation and error messages

### Supported Media Types
- **Images**: JPEG, PNG, GIF, WebP (max 5MB)
- **Videos**: MP4, 3GPP, QuickTime (max 16MB)
- **Audio**: AAC, MP4, MPEG, AMR, OGG (max 16MB)
- **Documents**: PDF, Word, Excel, PowerPoint, Text, CSV (max 100MB)

## API Endpoints

### Webhook Endpoints
- `POST /webhook/twilio` - Twilio webhook for incoming SMS messages

### API Endpoints
- `GET /api/health` - Health check
- `POST /api/send-message` - Send a single SMS message (supports media)
- `POST /api/send-bulk` - Send bulk SMS messages
- `GET /api/account-info` - Get Twilio account information
- `POST /api/send-promotions` - Send scheduled promotions
- `GET /api/customers` - Get all customers
- `GET /api/products` - Get all products

## Usage Examples

### Send a Text Message
```bash
curl -X POST http://localhost:5040/api/send-message \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "message": "Hello from ChatPilot!"}'
```

### Send a Message with Media
```bash
curl -X POST http://localhost:5040/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890", 
    "message": "Check out this image!",
    "media": {
      "filename": "image.jpg",
      "mimetype": "image/jpeg",
      "data": "base64-encoded-file-data-here"
    }
  }'
```

### Send Bulk Messages
```bash
curl -X POST http://localhost:5040/api/send-bulk \
  -H "Content-Type: application/json" \
  -d '{"phoneNumbers": ["+1234567890", "+0987654321"], "message": "Bulk message"}'
```

### Send Promotions
```bash
curl -X POST http://localhost:5040/api/send-promotions \
  -H "Content-Type: application/json" \
  -d '{"daysInactive": 3}'
```

## Twilio Webhook Setup

To receive incoming SMS messages, configure your Twilio phone number webhook:

1. Go to Twilio Console > Phone Numbers > Manage > Active Numbers
2. Click on your phone number
3. In the "Messaging" section, set the webhook URL to: `https://your-domain.com/webhook/twilio`
4. Set HTTP method to POST

## Database Schema

The application uses MongoDB with the following collections:

### Customers Collection
```javascript
{
  phone: string,
  lastContact: Date,
  conversationHistory: Array<{
    role: string,
    content: string
  }>
}
```

### Products Collection
```javascript
{
  name: string,
  description: string,
  price: number
}
```

### Knowledge Base Collection
```javascript
{
  query: string,
  content: string
}
```

## Development

The application uses:
- Node.js with TypeScript
- Express.js for the server
- Twilio SDK for SMS messaging
- OpenAI API for AI responses
- MongoDB for data storage
- Vite for development server

## Troubleshooting

1. **Twilio Authentication Error**: Check your Account SID and Auth Token
2. **MongoDB Connection Error**: Verify your MongoDB URI and network access
3. **OpenAI API Error**: Ensure your API key is valid and has credits
4. **Webhook Not Working**: Check that your webhook URL is publicly accessible
