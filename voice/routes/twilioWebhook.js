require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  const domain = process.env.DOMAIN;
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="https://${domain}/language-select" method="POST" timeout="10">
    <Say voice="Polly.Joanna-Neural">Welcome to the ordering system. For English, press 1. Für Deutsch, drücken Sie 2.</Say>
  </Gather>
  <Say voice="Polly.Joanna-Neural">No input received. Goodbye.</Say>
  <Hangup/>
</Response>`;
  res.type('text/xml').send(twiml);
});

module.exports = router;
