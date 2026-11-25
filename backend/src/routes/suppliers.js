const router = require('express').Router();
const { Supplier, Product, Purchase, ReorderRequest } = require('../models');
const { sendSuccess, fail } = require('../utils/response');
const { requireLogin } = require('../middleware/auth');
const { L } = require('../utils/query');
const { str, toInt, isEmail } = require('../utils/helpers');

router.use(requireLogin);

// GET /api/suppliers/get_suppliers
router.get('/get_suppliers', async (req, res) => {
  sendSuccess(res, 'Suppliers fetched successfully.', await L(Supplier.find().sort({ created_at: -1, id: -1 })));
});

// GET /api/suppliers/get_supplier_details?id=
router.get('/get_supplier_details', async (req, res) => {
  const id = toInt(req.query.id);
  if (id <= 0) fail('Supplier id is required.');
  const supplier = await L(Supplier.findOne({ id }));
  if (!supplier) fail('Supplier not found.', 404);

  const [products, purchases] = await Promise.all([
    L(Product.find({ supplier_id: id }).sort({ id: 1 })).then((rows) =>
      rows.map((p) => ({ id: p.id, product_name: p.product_name, quantity: p.quantity, selling_price: p.selling_price }))),
    L(Purchase.find({ supplier_id: id }).sort({ purchase_date: -1 })).then((rows) =>
      rows.map((p) => ({
        id: p.id, purchase_number: p.purchase_number, total_amount: p.total_amount,
        order_status: p.order_status, purchase_date: p.purchase_date,
      }))),
  ]);
  sendSuccess(res, 'Supplier details fetched successfully.', { ...supplier, products, purchases });
});

const fields = (b) => ({
  supplier_name: str(b.supplier_name),
  company_name: str(b.company_name),
  phone: str(b.phone),
  email: str(b.email),
  address: str(b.address),
  city: str(b.city),
  country: str(b.country),
  notes: str(b.notes),
});

// POST /api/suppliers/add_supplier
router.post('/add_supplier', async (req, res) => {
  const d = fields(req.body);
  if (!d.supplier_name) fail('Supplier name is required.');
  if (d.email && !isEmail(d.email)) fail('Invalid email format.');

  const or = [];
  if (d.email) or.push({ email: d.email });
  if (d.phone) or.push({ phone: d.phone });
  if (or.length && (await Supplier.exists({ $or: or }))) fail('A supplier with this email or phone already exists.');

  const s = await Supplier.create(d);
  sendSuccess(res, 'Supplier added successfully.', { id: s.id });
});

// POST /api/suppliers/update_supplier
router.post('/update_supplier', async (req, res) => {
  const id = toInt(req.body.id);
  const d = fields(req.body);
  const status = req.body.status || 'Active';
  if (id <= 0 || !d.supplier_name) fail('Supplier id and name are required.');
  await Supplier.updateOne({ id }, { $set: { ...d, status } }, { runValidators: true });
  sendSuccess(res, 'Supplier updated successfully.');
});

// POST /api/suppliers/delete_supplier
router.post('/delete_supplier', async (req, res) => {
  const id = toInt(req.body.id);
  if (id <= 0) fail('Supplier id is required.');
  await Supplier.deleteOne({ id });
  // ON DELETE SET NULL
  await Promise.all([
    Product.updateMany({ supplier_id: id }, { $set: { supplier_id: null } }),
    Purchase.updateMany({ supplier_id: id }, { $set: { supplier_id: null } }),
    ReorderRequest.updateMany({ supplier_id: id }, { $set: { supplier_id: null } }),
  ]);
  sendSuccess(res, 'Supplier deleted successfully.');
});

module.exports = router;
