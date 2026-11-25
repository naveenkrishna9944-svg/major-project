const { Notification } = require('../models');
const { Product } = require('../models');

/** Plain objects without Mongo's internal _id (responses mirror the old SQL rows). */
const L = (query) => query.select('-_id').lean();

/** Insert a notification row (same columns the PHP code used). */
const notify = (user_id, title, message, type) => Notification.create({ user_id, title, message, type });

/**
 * Atomically take stock. Returns { previous, next } or null when there is not enough stock.
 * Replaces the SELECT ... FOR UPDATE + UPDATE pair of the PHP version, and works on a
 * standalone MongoDB (no replica set / transactions required).
 */
async function decrementStock(productId, qty) {
  const doc = await Product.findOneAndUpdate(
    { id: productId, quantity: { $gte: qty } },
    { $inc: { quantity: -qty } },
    { returnDocument: 'after' },
  ).lean();
  return doc ? { previous: doc.quantity + qty, next: doc.quantity } : null;
}

/** Atomically add stock. Returns { previous, next } or null if the product does not exist. */
async function incrementStock(productId, qty) {
  const doc = await Product.findOneAndUpdate(
    { id: productId },
    { $inc: { quantity: qty } },
    { returnDocument: 'after' },
  ).lean();
  return doc ? { previous: doc.quantity - qty, next: doc.quantity } : null;
}

module.exports = { L, notify, decrementStock, incrementStock };
