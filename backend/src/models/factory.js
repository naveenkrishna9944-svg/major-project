const mongoose = require('mongoose');
const { nextId } = require('../utils/counter');

/**
 * Builds a model that behaves like a MySQL table:
 *  - numeric auto-increment `id` (kept so the API responses look exactly like the PHP ones)
 *  - created_at / updated_at timestamps (optional, like the original tables)
 *  - `_id` hidden in JSON output
 */
function makeModel(name, collection, definition, { updatedAt = true, timestamps = true } = {}) {
  const schema = new mongoose.Schema(
    { id: { type: Number, unique: true, index: true }, ...definition },
    {
      collection,
      versionKey: false,
      timestamps: timestamps
        ? { createdAt: 'created_at', updatedAt: updatedAt ? 'updated_at' : false }
        : false,
    },
  );

  schema.pre('validate', async function assignId() {
    if (this.isNew && (this.id === undefined || this.id === null)) {
      this.id = await nextId(collection);
    }
  });

  schema.set('toJSON', {
    transform: (_doc, ret) => {
      delete ret._id;
      return ret;
    },
  });

  return mongoose.model(name, schema);
}

const Status = { type: String, enum: ['Active', 'Inactive'], default: 'Active' };

module.exports = { makeModel, Status };
