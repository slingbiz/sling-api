const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const GenerateUsage = require('../models/generateUsage.model');

function dailyLimit() {
  const raw = Number(process.env.GENERATE_DAILY_LIMIT);
  if (!Number.isFinite(raw)) {
    return 20;
  }
  return raw;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

const consumeGenerateQuota = async (clientId) => {
  const limit = dailyLimit();
  if (limit <= 0) {
    return { remaining: Infinity, limit: 0 };
  }
  const day = todayKey();
  const existing = await GenerateUsage.findOne({ clientId, day });
  if (existing && existing.count >= limit) {
    throw new ApiError(
      httpStatus.TOO_MANY_REQUESTS,
      `Daily generate limit reached (${limit}). Try tomorrow, or self-host with your own Gemini key.`
    );
  }
  const doc = await GenerateUsage.findOneAndUpdate(
    { clientId, day },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );
  return { remaining: Math.max(0, limit - doc.count), limit };
};

module.exports = {
  consumeGenerateQuota,
  dailyLimit,
};
