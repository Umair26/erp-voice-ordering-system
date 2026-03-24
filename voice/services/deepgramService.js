require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

function startDeepgramStream(onTranscript, language = 'EN') {
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
  console.log('🔑 Deepgram API key:', process.env.DEEPGRAM_API_KEY ? 'loaded' : 'MISSING');
  console.log(`🌍 Deepgram language: ${language === 'DE' ? 'de' : 'en-US'}`);

  const live = deepgram.listen.live({
    model: 'nova-3',
    language: language === 'DE' ? 'de' : 'en-US',
    encoding: 'mulaw',
    sample_rate: 8000,
    punctuate: true,
    interim_results: true,
    endpointing: 500,
  });

  let accumulatedText = '';
  let silenceTimer = null;
  const SILENCE_DELAY = 3500;

  live.on(LiveTranscriptionEvents.Open, () => {
    console.log('🎙️  Deepgram connection open');
  });

  live.on(LiveTranscriptionEvents.Transcript, (data) => {
    const alt = data?.channel?.alternatives?.[0];
    const text = alt?.transcript?.trim();
    if (!text) return;

    if (data.is_final) {
      accumulatedText = (accumulatedText + ' ' + text).trim();
      console.log(`📝 Accumulated: "${accumulatedText}"`);

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

module.exports = { startDeepgramStream };