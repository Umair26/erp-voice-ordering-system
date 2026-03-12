const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  const domain = process.env.DOMAIN; // bare domain, no https://
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Hi there, tell me your customer ID to proceed.</Say>
  <Connect>
    <Stream url="wss://${domain}/audio-stream"/>
  </Connect>
</Response>`;
  res.type('text/xml').send(twiml);
});

module.exports = router;