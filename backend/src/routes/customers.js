const router = require('express').Router();
const { Customer, Sale } = require('../models');
const { sendSuccess, fail } = require('../utils/response');
const { requireLogin } = require('../middleware/auth');
const { L } = require('../utils/query');
const { str, toInt, round2 } = require('../utils/helpers');

router.use(requireLogin);

// GET /api/customers/get_customers
router.get('/get_customers', async (req, res) => {
  const [customers, stats] = await Promise.all([
    L(Customer.find().sort({ created_at: -1, id: -1 })),
    Sale.aggregate([
      { $match: { customer_id: { $ne: null } } },
      { $group: { _id: '$customer_id', n: { $sum: 1 }, spent: { $sum: '$grand_total' }, last: { $max: '$sale_date' } } },
    ]),
  ]);
  const map = new Map(stats.map((s) => [s._id, s]));
  sendSuccess(res, 'Customers fetched successfully.', customers.map((c) => {
    const s = map.get(c.id);
    return {
      ...c,
      total_purchases: s ? s.n : 0,
      total_spending: round2(s ? s.spent : 0),
      last_purchase_date: s ? s.last : null,
    };
  }));
});

const fields = (b) => ({
  customer_name: str(b.customer_name),
  phone: str(b.phone),
  email: str(b.email),
  address: str(b.address),
  city: str(b.city),
  notes: str(b.notes),
});

// POST /api/customers/add_customer
router.post('/add_customer', async (req, res) => {
  const data = fields(req.body);
  if (!data.customer_name) fail('Customer name is required.');
  const c = await Customer.create(data);
  sendSuccess(res, 'Customer added successfully.', { id: c.id });
});

// POST /api/customers/update_customer
router.post('/update_customer', async (req, res) => {
  const id = toInt(req.body.id);
  const data = fields(req.body);
  if (id <= 0 || !data.customer_name) fail('Customer id and name are required.');
  await Customer.updateOne({ id }, { $set: data });
  sendSuccess(res, 'Customer updated successfully.');
});

// POST /api/customers/delete_customer
router.post('/delete_customer', async (req, res) => {
  const id = toInt(req.body.id);
  if (id <= 0) fail('Customer id is required.');
  await Customer.deleteOne({ id });
  await Sale.updateMany({ customer_id: id }, { $set: { customer_id: null } }); // ON DELETE SET NULL
  sendSuccess(res, 'Customer deleted successfully.');
});

module.exports = router;
