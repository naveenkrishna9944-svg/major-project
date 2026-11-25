const router = require('express').Router();
const { Sale, SaleItem, Customer, Employee, Product } = require('../models');
const { sendSuccess, fail } = require('../utils/response');
const { requireLogin, requireRole } = require('../middleware/auth');
const { L } = require('../utils/query');
const { toInt, byId, round2 } = require('../utils/helpers');

// GET /api/sales/get_sales
router.get('/get_sales', requireLogin, async (req, res) => {
  const [sales, customers, employees] = await Promise.all([
    L(Sale.find().sort({ sale_date: -1, id: -1 })),
    L(Customer.find()),
    L(Employee.find()),
  ]);
  const cs = byId(customers);
  const es = byId(employees);
  sendSuccess(res, 'Sales fetched successfully.', sales.map((s) => ({
    id: s.id,
    invoice_number: s.invoice_number,
    grand_total: s.grand_total,
    payment_method: s.payment_method,
    sale_date: s.sale_date,
    customer_name: cs.get(s.customer_id)?.customer_name ?? null,
    employee_name: es.get(s.employee_id)?.full_name ?? null,
  })));
});

// GET /api/sales/get_sale_details?id=
router.get('/get_sale_details', requireLogin, async (req, res) => {
  const saleId = toInt(req.query.id);
  if (saleId <= 0) fail('Sale id is required.');
  const sale = await L(Sale.findOne({ id: saleId }));
  if (!sale) fail('Sale not found.', 404);

  const [customer, employee, itemRows] = await Promise.all([
    sale.customer_id ? Customer.findOne({ id: sale.customer_id }).lean() : null,
    sale.employee_id ? Employee.findOne({ id: sale.employee_id }).lean() : null,
    L(SaleItem.find({ sale_id: saleId }).sort({ id: 1 })),
  ]);
  const products = byId(await L(Product.find({ id: { $in: itemRows.map((i) => i.product_id) } })));
  const items = itemRows
    .filter((i) => products.has(i.product_id))
    .map((i) => {
      const p = products.get(i.product_id);
      return { ...i, product_name: p.product_name, sku: p.sku, cost_price: p.cost_price };
    });
  const profit = items.reduce((sum, it) => sum + (it.price - it.cost_price) * it.quantity, 0);

  sendSuccess(res, 'Sale details fetched successfully.', {
    ...sale,
    customer_name: customer?.customer_name ?? null,
    employee_name: employee?.full_name ?? null,
    items,
    profit: round2(profit),
  });
});

// POST /api/sales/delete_sale   (Admin)
router.post('/delete_sale', requireRole('Admin'), async (req, res) => {
  const id = toInt(req.body.id);
  if (id <= 0) fail('Sale id is required.');
  await Sale.deleteOne({ id });
  await SaleItem.deleteMany({ sale_id: id }); // ON DELETE CASCADE
  sendSuccess(res, 'Sale deleted successfully.');
});

module.exports = router;
