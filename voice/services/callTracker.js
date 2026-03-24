const DEEPGRAM_COST_PER_MIN = 0.0059;
const TWILIO_COST_PER_MIN = 0.0085;

const callRecords = [];

function startCall(callSid) {
  // Don't duplicate
  if (callRecords.find(r => r.callSid === callSid)) return;
  callRecords.push({
    callSid,
    startTime: new Date(),
    endTime: null,
    durationSeconds: 0,
    deepgramSeconds: 0,
    customer: null,
    language: 'EN',
    orderPlaced: false,
    orderId: null,
    orderTotal: 0,
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
    // Recalculate cost whenever deepgramSeconds or durationSeconds updates
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
  return record;
}

function getAllCalls() {
  // Recalculate cost for active calls in real time before returning
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

module.exports = { startCall, getCall, updateCall, endCall, getAllCalls, getSummary };