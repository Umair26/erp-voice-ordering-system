require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const { WebSocketServer } = require('ws');
const twilio = require('twilio');
const { startDeepgramStream } = require('./services/deepgramService');
const { newCallState, updateState } = require('./services/callState');
const { startCall, updateCall, endCall } = require('./services/callTracker');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const callStates = new Map();
const urlParser = express.urlencoded({ extended: false });

function getTwilioVoice(language) {
  return language === 'DE' ? 'Polly.Vicki-Neural' : 'Polly.Joanna-Neural';
}

function isFinalMessage(text) {
  return /\b(auf wiedersehen|tschüss|tschüs|goodbye|bye|session has ended|sitzung beendet)\b/i.test(text);
}

async function sendVoiceResponse(text, callSid, language = 'DE') {
  try {
    console.log(`🔊 Response [${language}]: "${text}"`);
    if (global.logEvent) global.logEvent(null, 'BOT', `Bot said: "${text}"`);
    const domain = process.env.DOMAIN;
    const voice = getTwilioVoice(language);
    const final = isFinalMessage(text);
    const twiml = final
      ? `<Response><Say voice="${voice}">${text}</Say><Hangup/></Response>`
      : `<Response><Say voice="${voice}">${text}</Say><Connect><Stream url="wss://${domain}/audio-stream"><Parameter name="language" value="${language}"/></Stream></Connect></Response>`;
    await twilioClient.calls(callSid).update({ twiml });
    console.log(final ? '📴 Auf Wiedersehen — hanging up' : '✅ TwiML sent');
  } catch (err) {
    console.error('❌ Failed to send TwiML:', err.message);
  }
}

function initVoiceServer(app, server) {

  // ── ROUTE 1: Incoming call — German direct to audio stream ──
  app.post('/incoming-call', urlParser, (req, res) => {
    const domain = process.env.DOMAIN;
    console.log('📞 Incoming call received');
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Vicki-Neural">Willkommen beim Bestellsystem. Bitte nennen Sie Ihre Kundennummer.</Say>
  <Connect>
    <Stream url="wss://${domain}/audio-stream">
      <Parameter name="language" value="DE"/>
    </Stream>
  </Connect>
</Response>`;
    res.type('text/xml').send(twiml);
  });

  // ── ROUTE 2: Call status callback ──
  app.post('/call-status', urlParser, (req, res) => {
    console.log('📊 Raw body:', JSON.stringify(req.body));
    const { CallSid, CallDuration, CallStatus } = req.body;
    if (CallSid && CallDuration) {
      endCall(CallSid, parseInt(CallDuration));
      console.log(`📊 Call ended: ${CallSid} | Duration: ${CallDuration}s`);
    } else if (CallSid) {
      updateCall(CallSid, { status: CallStatus || 'unknown' });
    }
    res.sendStatus(200);
  });

 app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Call logs ──
const callLogs = [];
global.logEvent = (callSid, type, message, extra = '') => {
  callLogs.push({
    time: new Date().toLocaleTimeString('de-DE'),
    callSid: callSid ? callSid.slice(-6) : '------',
    type,
    message,
    extra: extra || undefined,
  });
  if (callLogs.length > 500) callLogs.shift();
};

app.get('/stt-logs', (req, res) => {
  if (!callLogs.length) {
    return res.send('<h2>No calls yet</h2>');
  }

  // Group by callSid
  const grouped = {};
  for (const log of callLogs) {
    if (!grouped[log.callSid]) grouped[log.callSid] = [];
    grouped[log.callSid].push(log);
  }

  let html = `
    <html><head><meta charset="utf-8">
    <title>Call Logs</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
      h1 { color: #333; }
      .call { background: white; border-radius: 8px; padding: 16px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .call-header { font-weight: bold; font-size: 16px; color: #444; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
      .log { padding: 6px 0; border-bottom: 1px solid #f0f0f0; display: flex; gap: 12px; }
      .time { color: #999; font-size: 12px; min-width: 70px; }
      .type-STT { color: #2196F3; font-weight: bold; }
      .type-BOT { color: #4CAF50; font-weight: bold; }
      .type-STATE { color: #FF9800; font-weight: bold; }
      .type-ERROR { color: #f44336; font-weight: bold; }
      .type-INFO { color: #9C27B0; font-weight: bold; }
      .msg { flex: 1; }
      .extra { color: #888; font-size: 12px; }
      .refresh { margin-bottom: 16px; }
      button { padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; }
    </style>
    </head><body>
    <h1>📞 Call Logs</h1>
    <div class="refresh"><button onclick="location.reload()">↻ Refresh</button></div>
  `;

  for (const [sid, logs] of Object.entries(grouped).reverse()) {
    const first = logs[0];
    html += `<div class="call">
      <div class="call-header">📱 Call ...${sid} — started ${first.time}</div>`;
    for (const log of logs) {
      html += `<div class="log">
        <span class="time">${log.time}</span>
        <span class="type-${log.type}">[${log.type}]</span>
        <span class="msg">${log.message}</span>
        ${log.extra ? `<span class="extra">${log.extra}</span>` : ''}
      </div>`;
    }
    html += `</div>`;
  }

  html += `</body></html>`;
  res.send(html);
});

  // ── ROUTE 3: Text injection for testing ──
  app.post('/api/inject-text', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    const entries = [...callStates.entries()];
    if (!entries.length) return res.status(404).json({ error: 'No active call' });

    const [callSid, state] = entries[entries.length - 1];
    console.log(`⌨ Text injection: "${text}" → CallSid: ${callSid}`);

    try {
      const response = await updateState(state, text);

      if (state.customer && callSid) {
        updateCall(callSid, { customer: state.customer.customer_name });
      }

      if (state.state === 'DONE' && state.lastOrder && callSid) {
        updateCall(callSid, {
          orderPlaced: true,
          orderId: state.lastOrder.order_id,
          orderTotal: state.lastOrder.total_price || 0,
        });
      }

      const lang = state.language || 'DE';
      if (response) await sendVoiceResponse(response, callSid, lang);
      res.json({ ok: true, response });
    } catch (e) {
      console.error('❌ Text injection error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── WEBSOCKET: Audio stream ──
  const wss = new WebSocketServer({ server, path: '/audio-stream' });

  wss.on('connection', (ws) => {
    console.log('📲 New call connected via WebSocket');

    let dgStream = null;
    let callSid = null;
    let processing = false;
    let state = null;
    let language = 'DE'; // ← German default
    let deepgramSeconds = 0;

    // ENGLISH DEFAULT — detached, uncomment to reattach
    // let language = 'EN';

    function startNewDeepgramStream() {
      try {
        dgStream = startDeepgramStream(async (transcript) => {
          if (!transcript || !transcript.trim()) return;
          if (processing) return;
          processing = true;

          if (global.logEvent) global.logEvent(callSid, 'STT', `Customer said: "${transcript}"`, `State: ${state?.state}`);

          if (/\b(auf wiedersehen|tschüss|tschüs|goodbye|bye)\b/i.test(transcript)) {
            await sendVoiceResponse('Auf Wiedersehen!', callSid, language);
            processing = false;
            return;
          }

          try {
            const response = await updateState(state, transcript);

            if (state.customer && callSid) {
              updateCall(callSid, { customer: state.customer.customer_name });
            }

             if (state.state === 'DONE' && state.lastOrder && callSid) {
              updateCall(callSid, {
                orderPlaced: true,
                orderId: state.lastOrder.order_id,
                orderTotal: state.lastOrder.total_price || 0,
                customerId: state.customer?.customer_id || null,
                orderItems: state.lastOrder.items || [],
              });
             }

            if (response && callSid) {
              await sendVoiceResponse(response, callSid, language);
            }
          } catch (err) {
            console.error('❌ Error in updateState:', err.message);
            if (global.logEvent) global.logEvent(callSid, 'ERROR', `Error: ${err.message}`);
            await sendVoiceResponse(
              'Es gab einen Fehler. Bitte versuchen Sie es erneut.',
              callSid, language
            );
          }

          processing = false;
        }, language);
      } catch (err) {
        console.error('❌ Failed to start Deepgram stream:', err.message);
      }
    }

    ws.on('message', async (msg) => {
      try {
        const data = JSON.parse(msg);

        if (data.event === 'connected') {
          console.log('🔗 Twilio media stream connected');
        }

        if (data.event === 'start') {
          callSid = data.start?.callSid;
          const params = data.start?.customParameters || {};
          language = params.language || 'DE'; // ← German default
          console.log(`📡 Stream started — CallSid: ${callSid} | Language: ${language}`);

          if (!callStates.has(callSid)) {
            const newState = newCallState();
            newState.language = language;
            callStates.set(callSid, newState);
            startCall(callSid);
            updateCall(callSid, { language });
            console.log(`📡 New call — CallSid: ${callSid}`);
            if (global.logEvent) global.logEvent(callSid, 'INFO', 'New call started', `Language: ${language}`);
          } else {
            const existingState = callStates.get(callSid);
            language = existingState.language || language;
            console.log(`📡 Reconnected — CallSid: ${callSid} | Lang: ${language}`);
          }

          state = callStates.get(callSid);
          startNewDeepgramStream();
        }

        if (data.event === 'media') {
          if (!dgStream || !state) return;
          const audio = Buffer.from(data.media.payload, 'base64');
          dgStream.send(audio);
          deepgramSeconds += 0.02;
        }

        if (data.event === 'stop') {
          console.log('🛑 Twilio stream stopped');
          if (callSid) updateCall(callSid, { deepgramSeconds: Math.round(deepgramSeconds) });
          if (dgStream) { try { dgStream.finish(); } catch (_) {} }
        }

      } catch (err) {
        console.error('❌ Error parsing WebSocket message:', err.message);
      }
    });

    ws.on('close', () => {
      console.log('📴 Call ended — WebSocket closed');
      if (dgStream) { try { dgStream.finish(); } catch (_) {} }
      if (callSid && state && state.state === 'DONE') {
        callStates.delete(callSid);
      }
    });

    ws.on('error', (err) => console.error('❌ WebSocket error:', err.message));
  });

  console.log('📞 Voice server attached — POST /incoming-call');
  console.log(`🔊 WebSocket stream → wss://${process.env.DOMAIN}/audio-stream`);
}

module.exports = { initVoiceServer };