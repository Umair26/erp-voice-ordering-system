// In-memory call tracker — stores cost records per call
const callRecords = [];

// Deepgram pricing: $0.0059 per minute (nova-2)
const DEEPGRAM_COST_PER_MIN = 0.0059;
// Twilio pricing: ~$0.0085 per minute inbound
const TWILIO_COST_PER_MIN = 0.0085;

function startCall(callSid) {
  const record = {
    callSid,
    startTime: new Date(),
    endTime: null,
    durationSeconds: 0,
    deepgramSeconds: 0,
    customer: null,
    orderPlaced: false,
    orderId: null,
    orderTotal: 0,
    deepgramCost: 0,
    twilioCost: 0,
    totalCost: 0,
    status: 'active',
  };
  callRecords.push(record);
  return record;
}

function getCall(callSid) {
  return callRecords.find(r => r.callSid === callSid);
}

function updateCall(callSid, updates) {
  const record = getCall(callSid);
  if (record) Object.assign(record, updates);
  return record;
}

function endCall(callSid, durationSeconds) {
  const record = getCall(callSid);
  if (!record) return;

  record.endTime = new Date();
  record.durationSeconds = durationSeconds || Math.round((record.endTime - record.startTime) / 1000);
  record.deepgramSeconds = record.deepgramSeconds || record.durationSeconds;

  const mins = record.durationSeconds / 60;
  record.deepgramCost = parseFloat((record.deepgramSeconds / 60 * DEEPGRAM_COST_PER_MIN).toFixed(4));
  record.twilioCost   = parseFloat((mins * TWILIO_COST_PER_MIN).toFixed(4));
  record.totalCost    = parseFloat((record.deepgramCost + record.twilioCost).toFixed(4));
  record.status = 'completed';

  return record;
}

function getAllCalls() {
  return [...callRecords].reverse(); // newest first
}

function getSummary() {
  const completed = callRecords.filter(r => r.status === 'completed');
  return {
    totalCalls: callRecords.length,
    completedCalls: completed.length,
    totalDeepgramCost: parseFloat(completed.reduce((s, r) => s + r.deepgramCost, 0).toFixed(4)),
    totalTwilioCost:   parseFloat(completed.reduce((s, r) => s + r.twilioCost, 0).toFixed(4)),
    totalCost:         parseFloat(completed.reduce((s, r) => s + r.totalCost, 0).toFixed(4)),
    ordersPlaced:      completed.filter(r => r.orderPlaced).length,
    totalOrderValue:   parseFloat(completed.reduce((s, r) => s + r.orderTotal, 0).toFixed(2)),
  };
}

module.exports = { startCall, getCall, updateCall, endCall, getAllCalls, getSummary };