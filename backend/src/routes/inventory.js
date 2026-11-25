const router = require('express').Router();
const { Product, Supplier, InventoryHistory, ReorderRequest, User } = require('../models');
const { sendSuccess, fail } = require('../utils/response');
const { requireLogin } = require('../middleware/auth');
const { L, notify, decrementStock, incrementStock } = require('../utils/query');
const { str, toInt, today, addDays, byId, round2 } = require('../utils/helpers');

router.use(requireLogin);

const lowStockFilter = { $expr: { $and: [{ $lte: ['$quantity', '$minimum_stock'] }, { $gt: ['$quantity', 0] }] } };
const suggested = (p) => Math.max(p.minimum_stock * 2 - p.quantity, p.minimum_stock);

const withSupplier = async (products) => {
  const sups = byId(await L(Supplier.find()));
  return products.map((p) => ({ ...p, supplier_name: sups.get(p.supplier_id)?.supplier_name ?? null }));
};

// GET /api/inventory/low_stock
router.get('/low_stock', async (req, res) => {
  const rows = await withSupplier(await L(Product.find(lowStockFilter).sort({ quantity: 1, id: 1 })));
  sendSuccess(res, 'Low stock products fetched successfully.', rows.map((p) => ({ ...p, suggested_reorder_qty: suggested(p) })));
});

// GET /api/inventory/out_of_stock
router.get('/out_of_stock', async (req, res) => {
  const rows = await withSupplier(await L(Product.find({ quantity: 0 }).sort({ updated_at: -1, id: -1 })));
  sendSuccess(res, 'Out of stock products fetched successfully.', rows);
});

// GET /api/inventory/expiry_center
router.get('/expiry_center', async (req, res) => {
  const t = today();
  const d3 = addDays(3);
  const d7 = addDays(7);
  const d15 = addDays(15);
  const products = await L(Product.find({ expiry_date: { $ne: null, $lte: addDays(30) } }).sort({ expiry_date: 1, id: 1 }));

  const status = (e) => {
    if (e < t) return 'Expired';
    if (e <= d3) return 'Expiring in 3 days';
    if (e <= d7) return 'Expiring in 7 days';
    if (e <= d15) return 'Expiring in 15 days';
    return 'Expiring in 30 days';
  };
  sendSuccess(res, 'Expiry center data fetched successfully.', products.map((p) => ({
    ...p,
    estimated_loss: round2(p.cost_price * p.quantity),
    expiry_status: status(p.expiry_date),
  })));
});

// GET /api/inventory/get_stock_history?product_id=
router.get('/get_stock_history', async (req, res) => {
  const productId = toInt(req.query.product_id);
  const filter = productId > 0 ? { product_id: productId } : {};
  const history = await L(InventoryHistory.find(filter).sort({ created_at: -1, id: -1 }).limit(200));

  const [products, users] = await Promise.all([L(Product.find()), L(User.find())]);
  const prods = byId(products);
  const usrs = byId(users);
  const rows = history
    .filter((h) => prods.has(h.product_id)) // INNER JOIN products
    .map((h) => ({
      ...h,
      product_name: prods.get(h.product_id).product_name,
      performed_by_name: usrs.get(h.performed_by)?.name ?? null,
    }));
  sendSuccess(res, 'Stock history fetched successfully.', rows);
});

// POST /api/inventory/reorder   { product_id }
router.post('/reorder', async (req, res) => {
  const product_id = toInt(req.body.product_id);
  if (product_id <= 0) fail('Product id is required.');
  const product = await Product.findOne({ id: product_id }).lean();
  if (!product) fail('Product not found.', 404);

  const qty = suggested(product);
  await ReorderRequest.create({
    product_id,
    supplier_id: product.supplier_id,
    requested_quantity: qty,
    created_by: req.session.user_id,
  });
  await notify(
    req.session.user_id,
    'Supplier Order',
    `Reorder request created for ${product.product_name} (${qty} units).`,
    'Purchase',
  );
  sendSuccess(res, 'Reorder request sent successfully.', { requested_quantity: qty });
});

// POST /api/inventory/stock_in   { product_id, quantity }
router.post('/stock_in', async (req, res) => {
  const product_id = toInt(req.body.product_id);
  const quantity = toInt(req.body.quantity);
  if (product_id <= 0 || quantity <= 0) fail('Product and a positive quantity are required.');

  const r = await incrementStock(product_id, quantity);
  if (!r) fail('Product not found.');
  await InventoryHistory.create({
    product_id, previous_quantity: r.previous, quantity_changed: quantity,
    new_quantity: r.next, action_type: 'Stock In', performed_by: req.session.user_id,
  });
  sendSuccess(res, 'Stock added successfully.', { new_quantity: r.next });
});

// POST /api/inventory/stock_out   { product_id, quantity, reason }
router.post('/stock_out', async (req, res) => {
  const product_id = toInt(req.body.product_id);
  const quantity = toInt(req.body.quantity);
  str(req.body.reason, 'Manual removal'); // accepted for API compatibility (was unused in PHP too)
  if (product_id <= 0 || quantity <= 0) fail('Product and a positive quantity are required.');

  const r = await decrementStock(product_id, quantity);
  if (!r) {
    if (!(await Product.exists({ id: product_id }))) fail('Product not found.');
    fail('Cannot remove more stock than is available.');
  }
  await InventoryHistory.create({
    product_id, previous_quantity: r.previous, quantity_changed: -quantity,
    new_quantity: r.next, action_type: 'Stock Out', performed_by: req.session.user_id,
  });
  sendSuccess(res, 'Stock removed successfully.', { new_quantity: r.next });
});

module.exports = router;
