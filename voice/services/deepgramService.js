const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

function startDeepgramStream(onTranscript) {
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

  const live = deepgram.listen.live({
    model: 'nova-2',
    language: 'de',        // or 'en', can switch dynamically
    encoding: 'mulaw',     // matches Twilio
    sample_rate: 8000,
    punctuate: true,
    interim_results: true,
  });

  live.on(LiveTranscriptionEvents.Transcript, (data) => {
    const text = data.channel.alternatives[0].transcript;
    if (text && data.is_final) onTranscript(text);
  });

  return live;
}

module.exports = { startDeepgramStream };