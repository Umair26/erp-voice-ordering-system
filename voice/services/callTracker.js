const { Brevo, BrevoClient } = require('@getbrevo/brevo');
const brevoClient = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

const DEEPGRAM_COST_PER_MIN = 0.0059;
const TWILIO_COST_PER_MIN = 0.0085;
const callRecords = [];

async function sendCallSummaryEmail(record) {
  try {
    const summary = {
      customer_id: record.customerId || null,
      customer_name: record.customer || null,
      order_id: record.orderId || null,
      order_placed: record.orderPlaced,
      order_total: record.orderTotal,
      items: record.orderItems || [],
      call_duration_seconds: record.durationSeconds,
      call_date: record.startTime,
    };

    await brevoClient.transactionalEmails.sendTransacEmail({
      to: [{ email: 'umairyqb26@gmail.com' }],
      sender: { email: 'vincent.rach.eu@gmail.com', name: 'ERP Bot' },
      subject: `Bestellzusammenfassung — Kunde ${record.customer || 'Unbekannt'} — ${record.orderId || 'Keine Bestellung'}`,
      htmlContent: `<pre>${JSON.stringify(summary, null, 2)}</pre>`,
      textContent: JSON.stringify(summary, null, 2),
    });

    console.log(`📧 Summary email sent for call ${record.callSid}`);
  } catch (err) {
    console.error('❌ Failed to send email:', err.message);
  }
}

function startCall(callSid) {
  if (callRecords.find(r => r.callSid === callSid)) return;
  callRecords.push({
    callSid,
    startTime: new Date(),
    endTime: null,
    durationSeconds: 0,
    deepgramSeconds: 0,
    customer: null,
    customerId: null,
    language: 'DE',
    orderPlaced: false,
    orderId: null,
    orderTotal: 0,
    orderItems: [],
    deepgramCost: 0,
    twilioCost: 0,
    totalCost: 0,
    status: 'active',
  });
}

function getCall(callSid) {
  return callRecords.find(r => r.callSid === callSid);
}

function updateCall(callSid, updates) {
  const record = getCall(callSid);
  if (record) {
    Object.assign(record, updates);
    if (updates.deepgramSeconds || updates.durationSeconds) {
      _recalcCost(record);
    }
  }
  return record;
}

function _recalcCost(record) {
  const dgMins = (record.deepgramSeconds || 0) / 60;
  const callMins = (record.durationSeconds || record.deepgramSeconds || 0) / 60;
  record.deepgramCost = parseFloat((dgMins * DEEPGRAM_COST_PER_MIN).toFixed(4));
  record.twilioCost   = parseFloat((callMins * TWILIO_COST_PER_MIN).toFixed(4));
  record.totalCost    = parseFloat((record.deepgramCost + record.twilioCost).toFixed(4));
}

function endCall(callSid, durationSeconds) {
  const record = getCall(callSid);
  if (!record) return;
  record.endTime = new Date();
  record.durationSeconds = durationSeconds || Math.round((record.endTime - record.startTime) / 1000);
  _recalcCost(record);
  record.status = 'completed';
  console.log(`💰 Call ${callSid} — Duration: ${record.durationSeconds}s | Cost: $${record.totalCost}`);
  sendCallSummaryEmail(record);
  return record;
}

function getAllCalls() {
  const now = Date.now();
  for (const r of callRecords) {
    if (r.status === 'active') {
      const elapsedSeconds = Math.round((now - new Date(r.startTime).getTime()) / 1000);
      r.durationSeconds = elapsedSeconds;
      _recalcCost(r);
    }
  }
  return [...callRecords].reverse();
}

function getSummary() {
  return {
    totalCalls: callRecords.length,
    completedCalls: callRecords.filter(r => r.status === 'completed').length,
    activeCalls: callRecords.filter(r => r.status === 'active').length,
    totalDeepgramCost: parseFloat(callRecords.reduce((s, r) => s + r.deepgramCost, 0).toFixed(4)),
    totalTwilioCost:   parseFloat(callRecords.reduce((s, r) => s + r.twilioCost, 0).toFixed(4)),
    totalCost:         parseFloat(callRecords.reduce((s, r) => s + r.totalCost, 0).toFixed(4)),
    ordersPlaced:      callRecords.filter(r => r.orderPlaced).length,
    totalOrderValue:   parseFloat(callRecords.reduce((s, r) => s + r.orderTotal, 0).toFixed(2)),
  };
}

module.exports = { startCall, getCall, updateCall, endCall, getAllCalls, getSummary, sendCallSummaryEmail };