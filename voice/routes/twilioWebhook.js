require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const router = express.Router();

// Initial call entry — ask language preference via DTMF keypress
router.post('/', (req, res) => {
  // Handle both /incoming-call and /language-select hits on root
  const digit = req.body?.Digits;

  // If no digit yet — this is the initial call, show language menu
  if (!digit) {
    const domain = process.env.DOMAIN;
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="https://${domain}/language-select" method="POST" timeout="10">
    <Say voice="Polly.Joanna-Neural">Welcome to the ordering system. For English, press 1. Für Deutsch, drücken Sie 2.</Say>
  </Gather>
  <Say voice="Polly.Joanna-Neural">No input received. Goodbye.</Say>
  <Hangup/>
</Response>`;
    return res.type('text/xml').send(twiml);
  }

  // Digit received — this is the language-select response
  const domain = process.env.DOMAIN;
  const isDE = digit === '2';
  const voice = isDE ? 'Polly.Vicki-Neural' : 'Polly.Joanna-Neural';
  const greeting = isDE
    ? 'Willkommen. Bitte nennen Sie Ihre Kundennummer.'
    : 'Welcome. Please say your customer ID.';

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}">${greeting}</Say>
  <Connect>
    <Stream url="wss://${domain}/audio-stream">
      <Parameter name="language" value="${isDE ? 'DE' : 'EN'}"/>
    </Stream>
  </Connect>
</Response>`;
  return res.type('text/xml').send(twiml);
});

module.exports = router;
