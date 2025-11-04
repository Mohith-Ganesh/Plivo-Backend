# Text Analysis API Server

A Node.js Express server that acts as a middleware between a frontend application and an n8n workflow for text sentiment analysis. The server manages asynchronous processing by sending text to n8n for analysis and receiving results via a callback webhook.

## Features

- **Asynchronous Processing**: Send text to n8n workflow and wait for results via callback
- **Unique Request Tracking**: Each request gets a unique UUID for tracking
- **Timeout Handling**: Automatic timeout after 5 minutes for pending requests
- **Health Monitoring**: Built-in health check endpoint
- **CORS Enabled**: Ready for cross-origin requests from frontend applications
- **Request Status Tracking**: Check the status of any request by ID

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- n8n workflow configured with webhook endpoints

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd <project-directory>
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=3000
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-path
```

## Dependencies
```json
{
  "express": "^4.x.x",
  "cors": "^2.x.x",
  "axios": "^1.x.x",
  "uuid": "^9.x.x",
  "dotenv": "^16.x.x"
}
```

## API Endpoints

### 1. Process Text
Sends text to n8n for sentiment analysis.

**Endpoint:** `POST /api/process-text`

**Request Body:**
```json
{
  "text_to_analyze": "Your text content here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sentiment": "positive|negative|neutral",
    "explanation": "Detailed explanation of the sentiment",
    "confidence": 0.95,
    "final_result": "Complete analysis result"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

### 2. n8n Callback Webhook
Receives analysis results from n8n workflow.

**Endpoint:** `POST /api/n8n-callback`

**Request Body:**
```json
{
  "db_id": "unique-request-id",
  "sentiment": "positive",
  "explanation": "Analysis explanation",
  "confidence": 0.95,
  "final_result": "Complete result",
  "error": null
}
```

**Note:** Can also accept an array with a single object.

### 3. Health Check
Check server status and pending requests count.

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-04T10:30:00.000Z",
  "pendingRequests": 3
}
```

### 4. Request Status
Check if a specific request is still pending.

**Endpoint:** `GET /api/status/:requestId`

**Response:**
```json
{
  "requestId": "uuid-here",
  "status": "pending|completed_or_not_found"
}
```

## n8n Workflow Configuration

Your n8n workflow should:

1. **Receive the webhook** at the URL configured in `N8N_WEBHOOK_URL`
2. **Process the text** (sentiment analysis, AI processing, etc.)
3. **Send results back** to `POST http://your-server/api/n8n-callback` with the following structure:
```json
{
  "db_id": "original-request-id-from-webhook",
  "sentiment": "positive|negative|neutral",
  "explanation": "Your analysis explanation",
  "confidence": 0.95,
  "final_result": "Complete analysis result",
  "error": null
}
```

## Flow Diagram
```
Frontend → POST /api/process-text → Server generates UUID
                                   ↓
                            Server → n8n Webhook
                                   ↓
                            n8n processes text
                                   ↓
                            n8n → POST /api/n8n-callback
                                   ↓
                            Server resolves promise
                                   ↓
Frontend ← Response with results ← Server
or
Frontend ──▶ /api/process-text ──▶ Backend ──▶ n8n Workflow
                                 ▲                 │
                                 │                 ▼
                           /api/n8n-callback ◀─────
```

## Running the Server

### Development
```bash
node index.js
```

### Production
```bash
NODE_ENV=production node index.js
```

### With PM2
```bash
pm2 start index.js --name text-analysis-api
```

## Error Handling

The server handles the following error scenarios:

- **Missing text input**: Returns 400 Bad Request
- **Request timeout**: Automatically cleans up after 5 minutes
- **Missing request ID in callback**: Returns 400 Bad Request
- **No matching pending request**: Returns 404 Not Found
- **n8n processing errors**: Forwards error message to frontend

## Production Considerations

⚠️ **Important**: The current implementation uses an in-memory `Map` to store pending requests. For production environments, consider:

- **Redis**: For distributed systems and persistence
- **Database**: PostgreSQL/MongoDB for request tracking and history
- **Message Queue**: RabbitMQ or AWS SQS for better reliability
- **Load Balancing**: Sticky sessions if using in-memory storage with multiple instances

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 3000 | No |
| `N8N_WEBHOOK_URL` | n8n webhook endpoint URL | - | Yes |

## Security Recommendations

1. Add authentication to the callback endpoint
2. Validate callback origin (check n8n IP/signature)
3. Implement rate limiting
4. Add request payload size limits
5. Use HTTPS in production
6. Sanitize and validate all inputs

## License

[Your License Here]

## Support

For issues or questions, please contact [your-contact-info]