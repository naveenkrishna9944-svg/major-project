const mongoose = require('mongoose');

/**
 * MySQL AUTO_INCREMENT replacement: one counter document per collection.
 * Keeps the numeric `id` fields the frontend already relies on.
 */
const Counter = mongoose.models.Counter || mongoose.model(
  'Counter',
  new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }, { versionKey: false }),
);

async function nextId(name) {
  const c = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true },
  );
  return c.seq;
}

module.exports = { Counter, nextId };
