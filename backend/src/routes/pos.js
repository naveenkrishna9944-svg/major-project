const router = require('express').Router();
const {
  Product, Sale, SaleItem, Customer, Employee, Setting, InventoryHistory, Notification,
} = require('../models');
const { sendSuccess, fail, ApiError } = require('../utils/response');
const { requireLogin } = require('../middleware/auth');
const { L, notify, decrementStock, incrementStock } = require('../utils/query');
const { str, toInt, toFloat, round2, escapeRegex, ymdCompact, randomCode } = require('../utils/helpers');

router.use(requireLogin);

// GET /api/pos/search_products?q=
router.get('/search_products', async (req, res) => {
  const q = str(req.query.q);
  const filter = { status: 'Active', quantity: { $gt: 0 } };
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ product_name: rx }, { sku: rx }, { barcode: rx }];
  }
  const rows = await Product.find(filter)
    .sort({ product_name: 1 })
    .limit(50)
    .select('id product_name sku barcode image selling_price quantity -_id')
    .lean();
  sendSuccess(res, 'Products fetched.', rows);
});

// POST /api/pos/create_sale   { items:[{product_id, quantity}], customer_id, discount, payment_method }
router.post('/create_sale', async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const customer_id = req.body.customer_id ? toInt(req.body.customer_id) || null : null;
  const discount = toFloat(req.body.discount);
  const payment_method = req.body.payment_method || 'Cash';

  if (items.length === 0) fail('Cart is empty.');
  if (!['Cash', 'Card', 'Online'].includes(payment_method)) fail('Invalid payment method.');

  // Resolve employee id from logged-in user
  const emp = await Employee.findOne({ user_id: req.session.user_id }).lean();
  const employee_id = emp ? emp.id : null;

  // 1) Validate every line against the current catalogue / stock
  let subtotal = 0;
  const lines = [];
  for (const item of items) {
    const pid = toInt(item.product_id);
    const qty = toInt(item.quantity);
    if (qty <= 0) fail('Invalid quantity for a cart item.');
    const product = await Product.findOne({ id: pid }).lean();
    if (!product) fail('A product in the cart no longer exists.');
    if (product.quantity < qty) fail(`Insufficient stock available for ${product.product_name}.`);
    const price = product.selling_price;
    const total = price * qty;
    subtotal += total;
    lines.push({ product_id: pid, quantity: qty, price, total, minimum_stock: product.minimum_stock, product_name: product.product_name });
  }

  // 2) Totals (tax from settings)
  const settings = await Setting.findOne().sort({ id: 1 }).lean();
  const taxRate = settings ? settings.tax_rate : 0;
  const prefix = settings?.invoice_prefix ?? 'INV-';
  const afterDiscount = Math.max(subtotal - discount, 0);
  const tax = round2(afterDiscount * (taxRate / 100));
  const grand_total = round2(afterDiscount + tax);
  const invoice_number = `${prefix}${ymdCompact()}-${randomCode()}`;

  // 3) Take stock atomically; undo everything if any line fails
  const taken = [];
  const created = { sale: null };
  try {
    for (const l of lines) {
      const r = await decrementStock(l.product_id, l.quantity);
      if (!r) throw new ApiError(`Insufficient stock available for ${l.product_name}.`);
      taken.push({ ...l, previous: r.previous, next: r.next });
    }

    const sale = await Sale.create({
      invoice_number, customer_id, employee_id,
      subtotal: round2(subtotal), discount, tax, grand_total, payment_method,
    });
    created.sale = sale;

    for (const t of taken) {
      await SaleItem.create({ sale_id: sale.id, product_id: t.product_id, quantity: t.quantity, price: t.price, total: round2(t.total) });
      await InventoryHistory.create({
        product_id: t.product_id, previous_quantity: t.previous, quantity_changed: -t.quantity,
        new_quantity: t.next, action_type: 'Sale', reference_id: sale.id, performed_by: req.session.user_id,
      });
      if (t.next === 0) {
        await notify(req.session.user_id, 'Out of Stock', `${t.product_name} is now unavailable.`, 'Out Of Stock');
      } else if (t.next <= t.minimum_stock) {
        await notify(req.session.user_id, 'Low Stock Alert', `${t.product_name} stock is below minimum level.`, 'Low Stock');
      }
    }

    sendSuccess(res, 'Sale completed successfully.', {
      sale_id: sale.id,
      invoice_number,
      subtotal: round2(subtotal),
      discount,
      tax,
      grand_total,
    });
  } catch (err) {
    // Roll back: give the stock back and remove anything already written for this sale
    await Promise.all(taken.map((t) => incrementStock(t.product_id, t.quantity)));
    if (created.sale) {
      const sid = created.sale.id;
      await Promise.all([
        Sale.deleteOne({ id: sid }),
        SaleItem.deleteMany({ sale_id: sid }),
        InventoryHistory.deleteMany({ action_type: 'Sale', reference_id: sid }),
      ]);
    }
    if (err instanceof ApiError) throw err;
    console.error(err);
    fail('Sale failed. Please try again.', 500);
  }
});

// GET /api/pos/get_invoice?sale_id=
router.get('/get_invoice', async (req, res) => {
  const saleId = toInt(req.query.sale_id);
  if (saleId <= 0) fail('Sale id is required.');
  const sale = await L(Sale.findOne({ id: saleId }));
  if (!sale) fail('Sale not found.', 404);

  const [customer, employee, itemRows, settings] = await Promise.all([
    sale.customer_id ? Customer.findOne({ id: sale.customer_id }).lean() : null,
    sale.employee_id ? Employee.findOne({ id: sale.employee_id }).lean() : null,
    L(SaleItem.find({ sale_id: saleId }).sort({ id: 1 })),
    Setting.findOne().sort({ id: 1 }).lean(),
  ]);
  const products = await L(Product.find({ id: { $in: itemRows.map((i) => i.product_id) } }));
  const pmap = new Map(products.map((p) => [p.id, p]));
  const items = itemRows
    .filter((i) => pmap.has(i.product_id))
    .map((i) => ({ ...i, product_name: pmap.get(i.product_id).product_name, sku: pmap.get(i.product_id).sku }));

  sendSuccess(res, 'Invoice fetched successfully.', {
    ...sale,
    customer_name: customer?.customer_name ?? null,
    employee_name: employee?.full_name ?? null,
    items,
    store: settings
      ? { store_name: settings.store_name, address: settings.address, phone: settings.phone, email: settings.email, currency: settings.currency }
      : null,
  });
});

module.exports = router;
