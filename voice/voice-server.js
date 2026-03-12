require('dotenv').config();

const express = require('express');
const { WebSocketServer } = require('ws');
const twilio = require('twilio');
const twilioRoute = require('./routes/twilioWebhook');
const { startDeepgramStream } = require('./services/deepgramService');
const { searchProduct } = require('./services/semanticSearch');
const { lookupCustomer, createOrder } = require('./services/erpService');
const { newCallState, updateState } = require('./services/callState');

const PORT = process.env.VOICE_PORT || 4000;

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/incoming-call', twilioRoute);

// Health check — useful for Railway / ngrok to confirm server is up
app.get('/health', (req, res) => {
  res.json({ status: 'ok', port: PORT });
});

// Helper function to send voice response via Twilio API
async function sendVoiceResponse(callSid, text) {
  try {
    // Send Say command but keep stream open with a Gather for continued listening
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${escapeXml(text)}</Say>
  <Gather input="speech" timeout="30" speechTimeout="auto" numDigits="0">
    <Pause length="1"/>
  </Gather>
</Response>`;

    await twilioClient.calls(callSid).update({ twiml });
    console.log(`📞 Sent to Twilio: "${text}"`);
  } catch (err) {
    console.error('❌ Failed to send response via Twilio:', err.message);
  }
}

// Helper function to escape XML special characters
function escapeXml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const server = app.listen(PORT, () => {
  console.log(`✅ Voice server running on port ${PORT}`);
  console.log(`📞 Twilio webhook → POST /incoming-call`);
  console.log(`🔊 WebSocket stream → wss://YOUR_DOMAIN/audio-stream`);
});

const wss = new WebSocketServer({ server, path: '/audio-stream' });

wss.on('connection', (ws) => {
  console.log('📲 New call connected via WebSocket');

  const state = newCallState();
  let dgStream = null;
  let callSid = null;  // Store CallSid for Twilio API calls

  // Start Deepgram stream — handle failure gracefully
  try {
    dgStream = startDeepgramStream(async (transcript) => {
      if (!transcript || !transcript.trim()) return;

      console.log(`🎤 Transcript: "${transcript}"`);

      try {
        const response = await updateState(state, transcript);
        if (response && callSid) {
          // Send response via Twilio REST API instead of WebSocket
          await sendVoiceResponse(callSid, response);
        }
      } catch (err) {
        console.error('❌ Error in updateState:', err.message);
        // Send error message to caller via Twilio API
        if (callSid) {
          await sendVoiceResponse(callSid, 'There was an error processing your request. Please try again.');
        }
      }
    });
  } catch (err) {
    console.error('❌ Failed to start Deepgram stream:', err.message);
  }

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.event === 'connected') {
        console.log('🔗 Twilio media stream connected');
      }

      if (data.event === 'start') {
        const startData = data.start || {};
        callSid = startData.callSid;  // Capture CallSid for API calls
        console.log(`📡 Stream started — CallSid: ${callSid}`);
      }

      if (data.event === 'media') {
        if (!dgStream) return;
        const audio = Buffer.from(data.media.payload, 'base64');
        console.log('🔊 Audio chunk received, size:', audio.length);
        dgStream.send(audio);
      }

      if (data.event === 'stop') {
        console.log('🛑 Twilio stream stopped');
      }
    } catch (err) {
      console.error('❌ Error parsing WebSocket message:', err.message);
    }
  });

  ws.on('close', () => {
    console.log('📴 Call ended — WebSocket closed');
    if (dgStream) {
      try { dgStream.finish(); } catch (_) {}
    }
  });

  ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err.message);
  });
});

// Catch unhandled server errors — don't crash the process
server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
});