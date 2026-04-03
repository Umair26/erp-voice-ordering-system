require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  const domain = process.env.DOMAIN;
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

// ENGLISH VERSION — detached, uncomment to reattach
/*
router.post('/', (req, res) => {
  const domain = process.env.DOMAIN;
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">Welcome to the ordering system. Please say your customer ID.</Say>
  <Connect>
    <Stream url="wss://${domain}/audio-stream">
      <Parameter name="language" value="EN"/>
    </Stream>
  </Connect>
</Response>`;
  res.type('text/xml').send(twiml);
});
*/

module.exports = router;