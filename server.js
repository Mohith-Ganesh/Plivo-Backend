const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Store pending requests (in production, use Redis or a database)
const pendingRequests = new Map();

// Configuration
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'YOUR_N8N_WEBHOOK_URL';

/**
 * Endpoint to receive text from frontend and send to n8n
 */
app.post('/api/process-text', async (req, res) => {
  try {
    const { text_to_analyze } = req.body;

    if (!text_to_analyze) {
      return res.status(400).json({ 
        success: false, 
        error: 'Text input is required' 
      });
    }

    // Generate unique request ID
    const db_id = uuidv4();

    // Create a promise that will be resolved when webhook receives response
    const responsePromise = new Promise((resolve, reject) => {
      pendingRequests.set(db_id, { resolve, reject });
      
      // Timeout after 5 minutes
      setTimeout(() => {
        if (pendingRequests.has(db_id)) {
          pendingRequests.delete(db_id);
          reject(new Error('Request timeout'));
        }
      }, 300000);
    });

    // Send request to n8n workflow
    const n8nPayload = {
      db_id,
      text_to_analyze,
      timestamp: new Date().toISOString()
    };

    // Call n8n webhook
    await axios.post(N8N_WEBHOOK_URL, n8nPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Wait for n8n to process and send back response
    const result = await responsePromise;

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error processing text:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process text'
    });
  }
});

/**
 * Webhook endpoint to receive response from n8n
 */
app.post('/api/n8n-callback', (req, res) => {
  try {
    let data = req.body;

    // Handle if n8n sends an array
    if (Array.isArray(data)) {
      data = data[0];
    }

    const { db_id, final_result, error } = data;

    if (!db_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Request ID is missing in callback' 
      });
    }

    const pending = pendingRequests.get(db_id);

    if (!pending) {
      console.warn(`No pending request found for requestId: ${db_id}`);
      return res.status(404).json({ 
        success: false, 
        error: 'No matching pending request found' 
      });
    }

    // Resolve the pending request
    if (error) {
      pending.reject(new Error(error));
    } else {
      // Send back the full result object for frontend display
      pending.resolve({
        sentiment: data.sentiment,
        explanation: data.explanation,
        confidence: data.confidence,
        final_result: data.final_result
      });
    }

    // Remove it from pending map
    pendingRequests.delete(db_id);

    res.json({ 
      success: true, 
      message: 'Callback processed successfully' 
    });

  } catch (error) {
    console.error('Error processing callback:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    pendingRequests: pendingRequests.size
  });
});

/**
 * Get status of a request
 */
app.get('/api/status/:requestId', (req, res) => {
  const { requestId } = req.params;
  const isPending = pendingRequests.has(requestId);
  
  res.json({
    requestId,
    status: isPending ? 'pending' : 'completed_or_not_found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;