require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const https = require('https');

function startDeepgramStream(onTranscript) {
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
  console.log('🔑 Deepgram API key:', process.env.DEEPGRAM_API_KEY ? 'loaded' : 'MISSING');

  const live = deepgram.listen.live({
    model: 'nova-2',
    language: 'en-US',
    encoding: 'mulaw',
    sample_rate: 8000,
    punctuate: true,
    interim_results: true,
    endpointing: 500,   // Short endpointing — we handle debouncing ourselves
  });

  let accumulatedText = '';
  let silenceTimer = null;
  const SILENCE_DELAY = 3500; // Wait 2s after last is_final before processing

  live.on(LiveTranscriptionEvents.Open, () => {
    console.log('🎙️  Deepgram connection open');
  });

  live.on(LiveTranscriptionEvents.Transcript, (data) => {
    const alt = data?.channel?.alternatives?.[0];
    const text = alt?.transcript?.trim();

    if (!text) return;

    if (data.is_final) {
      // Accumulate final chunks
      accumulatedText = (accumulatedText + ' ' + text).trim();
      console.log(`📝 Accumulated: "${accumulatedText}"`);

      // Reset silence timer — wait for more speech
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (accumulatedText) {
          console.log(`✅ Final input: "${accumulatedText}"`);
          onTranscript(accumulatedText);
          accumulatedText = '';
        }
      }, SILENCE_DELAY);
    }
  });

  live.on(LiveTranscriptionEvents.Error, (err) => {
    console.error('❌ Deepgram error:', err);
  });

  live.on(LiveTranscriptionEvents.Close, () => {
    console.log('🔌 Deepgram connection closed');
    if (silenceTimer) clearTimeout(silenceTimer);
  });

  return live;
}

// Text-to-speech using Deepgram REST API
async function synthesizeText(text) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) return reject(new Error('DEEPGRAM_API_KEY not set'));

    const options = {
      hostname: 'api.deepgram.com',
      port: 443,
      path: '/v1/speak?model=aura-asteria-en&encoding=mulaw&sample_rate=8000',
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify({ text })),
      },
    };

    const req = https.request(options, (res) => {
      let data = Buffer.alloc(0);
      res.on('data', (chunk) => { data = Buffer.concat([data, chunk]); });
      res.on('end', () => {
        if (res.statusCode === 200) resolve(data);
        else reject(new Error(`Deepgram TTS failed: ${res.statusCode}`));
      });
    });

    req.on('error', (e) => reject(new Error(`TTS request failed: ${e.message}`)));
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('TTS timeout')); });
    req.write(JSON.stringify({ text }));
    req.end();
  });
}

module.exports = { startDeepgramStream, synthesizeText };