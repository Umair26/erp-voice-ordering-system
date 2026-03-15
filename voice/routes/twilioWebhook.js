const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  const domain = process.env.DOMAIN;
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Welcome to the ordering system. Please state your customer ID or email.</Say>
  <Connect>
    <Stream url="wss://${domain}/audio-stream" statusCallback="https://${domain}/call-status" statusCallbackMethod="POST"/>
  </Connect>
</Response>`;
  res.type('text/xml').send(twiml);

module.exports = router;