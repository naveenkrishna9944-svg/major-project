const router = require('express').Router();
const { Purchase, PurchaseItem, Supplier, Product, User, InventoryHistory } = require('../models');
const { sendSuccess, fail, ApiError } = require('../utils/response');
const { requireLogin } = require('../middleware/auth');
const { L, notify, incrementStock } = require('../utils/query');
const { toInt, toFloat, byId, round2, ymdCompact, randomCode } = require('../utils/helpers');

router.use(requireLogin);

// GET /api/purchases/get_purchases
router.get('/get_purchases', async (req, res) => {
  const [purchases, suppliers, users] = await Promise.all([
    L(Purchase.find().sort({ purchase_date: -1, id: -1 })),
    L(Supplier.find()),
    L(User.find()),
  ]);
  const sups = byId(suppliers);
  const usrs = byId(users);
  sendSuccess(res, 'Purchases fetched successfully.', purchases.map((p) => ({
    ...p,
    supplier_name: sups.get(p.supplier_id)?.supplier_name ?? null,
    company_name: sups.get(p.supplier_id)?.company_name ?? null,
    created_by_name: usrs.get(p.created_by)?.name ?? null,
  })));
});

// GET /api/purchases/get_purchase_details?id=
router.get('/get_purchase_details', async (req, res) => {
  const id = toInt(req.query.id);
  if (id <= 0) fail('Purchase id is required.');
  const purchase = await L(Purchase.findOne({ id }));
  if (!purchase) fail('Purchase not found.', 404);

  const [supplier, itemRows] = await Promise.all([
    purchase.supplier_id ? Supplier.findOne({ id: purchase.supplier_id }).lean() : null,
    L(PurchaseItem.find({ purchase_id: id }).sort({ id: 1 })),
  ]);
  const products = byId(await L(Product.find({ id: { $in: itemRows.map((i) => i.product_id) } })));
  const items = itemRows
    .filter((i) => products.has(i.product_id))
    .map((i) => ({ ...i, product_name: products.get(i.product_id).product_name, sku: products.get(i.product_id).sku }));

  sendSuccess(res, 'Purchase details fetched successfully.', {
    ...purchase,
    supplier_name: supplier?.supplier_name ?? null,
    company_name: supplier?.company_name ?? null,
    phone: supplier?.phone ?? null,
    email: supplier?.email ?? null,
    items,
  });
});

// POST /api/purchases/create_purchase   { supplier_id, items:[{product_id, quantity, purchase_price}], payment_status }
router.post('/create_purchase', async (req, res) => {
  const supplier_id = req.body.supplier_id ? toInt(req.body.supplier_id) || null : null;
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const payment_status = req.body.payment_status || 'Unpaid';

  if (items.length === 0) fail('At least one purchase item is required.');
  if (!supplier_id) fail('Supplier is required.');
  if (!['Paid', 'Unpaid', 'Partial'].includes(payment_status)) fail('Invalid payment status.');

  let total = 0;
  const lines = [];
  for (const item of items) {
    const pid = toInt(item.product_id);
    const qty = toInt(item.quantity);
    const price = toFloat(item.purchase_price);
    if (qty <= 0 || price < 0) fail('Invalid quantity or price in purchase items.');
    if (!(await Product.exists({ id: pid }))) fail('A product in the order no longer exists.');
    const lineTotal = round2(qty * price);
    total += lineTotal;
    lines.push({ product_id: pid, quantity: qty, purchase_price: price, total: lineTotal });
  }

  const purchase_number = `PO-${ymdCompact()}-${randomCode()}`;
  let purchase;
  try {
    purchase = await Purchase.create({
      purchase_number, supplier_id, total_amount: round2(total), payment_status,
      order_status: 'Pending', created_by: req.session.user_id,
    });
    for (const l of lines) await PurchaseItem.create({ purchase_id: purchase.id, ...l });
  } catch (err) {
    if (purchase) {
      await Promise.all([Purchase.deleteOne({ id: purchase.id }), PurchaseItem.deleteMany({ purchase_id: purchase.id })]);
    }
    console.error(err);
    fail('Failed to create purchase order.', 500);
  }
  sendSuccess(res, 'Purchase order created successfully.', { id: purchase.id, purchase_number });
});

// POST /api/purchases/receive_purchase   { id }
router.post('/receive_purchase', async (req, res) => {
  const id = toInt(req.body.id);
  if (id <= 0) fail('Purchase id is required.');

  // Atomically flip Pending -> Received so a purchase can never be received twice
  const claimed = await Purchase.findOneAndUpdate({ id, order_status: 'Pending' }, { $set: { order_status: 'Received' } }).lean();
  if (!claimed) {
    const existing = await Purchase.findOne({ id }).lean();
    if (!existing) fail('Purchase not found.');
    if (existing.order_status === 'Received') fail('This purchase has already been received.');
    fail('Cannot receive a cancelled purchase.');
  }

  try {
    const items = await L(PurchaseItem.find({ purchase_id: id }));
    for (const item of items) {
      const r = await incrementStock(item.product_id, item.quantity);
      if (!r) continue; // product removed meanwhile
      await InventoryHistory.create({
        product_id: item.product_id, previous_quantity: r.previous, quantity_changed: item.quantity,
        new_quantity: r.next, action_type: 'Purchase', reference_id: id, performed_by: req.session.user_id,
      });
    }
    await notify(req.session.user_id, 'Purchase Received', 'A purchase order has been received and stock updated.', 'Purchase');
  } catch (err) {
    await Purchase.updateOne({ id }, { $set: { order_status: 'Pending' } });
    console.error(err);
    throw new ApiError('Failed to receive purchase.', 500);
  }
  sendSuccess(res, 'Purchase received and stock updated successfully.');
});

// POST /api/purchases/cancel_purchase   { id }
router.post('/cancel_purchase', async (req, res) => {
  const id = toInt(req.body.id);
  if (id <= 0) fail('Purchase id is required.');
  const r = await Purchase.updateOne({ id, order_status: 'Pending' }, { $set: { order_status: 'Cancelled' } });
  if (r.modifiedCount > 0) sendSuccess(res, 'Purchase cancelled successfully.');
  else fail('Only pending purchases can be cancelled.');
});

module.exports = router;
