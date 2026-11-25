const router = require('express').Router();
const { Sale, SaleItem, Product, Category, Customer, Supplier, Purchase, Employee } = require('../models');
const { sendSuccess } = require('../utils/response');
const { requireLogin } = require('../middleware/auth');
const { L } = require('../utils/query');
const { today, ymd, startOfDay, byId, round2 } = require('../utils/helpers');

router.use(requireLogin);

// GET /api/reports/sales_report?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/sales_report', async (req, res) => {
  const now = new Date();
  const from = req.query.from || ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const to = req.query.to || today();
  const start = startOfDay(from);
  const endExclusive = new Date(startOfDay(to).getFullYear(), startOfDay(to).getMonth(), startOfDay(to).getDate() + 1);

  const sales = await L(Sale.find({ sale_date: { $gte: start, $lt: endExclusive } }).sort({ sale_date: -1, id: -1 }));
  const [customers, employees] = await Promise.all([L(Customer.find()), L(Employee.find())]);
  const cs = byId(customers);
  const es = byId(employees);

  // Profit for the range
  const ids = sales.map((s) => s.id);
  const items = ids.length ? await L(SaleItem.find({ sale_id: { $in: ids } })) : [];
  const products = byId(await L(Product.find({ id: { $in: [...new Set(items.map((i) => i.product_id))] } })));
  let profit = 0;
  for (const it of items) {
    const p = products.get(it.product_id);
    if (p) profit += (it.price - p.cost_price) * it.quantity;
  }

  const revenue = sales.reduce((s, x) => s + x.grand_total, 0);
  sendSuccess(res, 'Sales report generated successfully.', {
    summary: {
      invoice_count: sales.length,
      revenue: round2(revenue),
      avg_invoice: round2(sales.length ? revenue / sales.length : 0),
      profit: round2(profit),
    },
    sales: sales.map((s) => ({
      ...s,
      customer_name: cs.get(s.customer_id)?.customer_name ?? null,
      employee_name: es.get(s.employee_id)?.full_name ?? null,
    })),
  });
});

// GET /api/reports/product_report
router.get('/product_report', async (req, res) => {
  const perProduct = await SaleItem.aggregate([
    { $group: { _id: '$product_id', units_sold: { $sum: '$quantity' }, revenue: { $sum: '$total' }, lines: { $push: { price: '$price', qty: '$quantity' } } } },
  ]);
  const products = await L(Product.find());
  const pmap = byId(products);
  const sold = new Map(perProduct.map((r) => [r._id, r]));

  const best_selling = perProduct
    .filter((r) => pmap.has(r._id))
    .map((r) => {
      const p = pmap.get(r._id);
      const profit = r.lines.reduce((s, l) => s + (l.price - p.cost_price) * l.qty, 0);
      return { id: p.id, product_name: p.product_name, units_sold: r.units_sold, revenue: round2(r.revenue), profit: round2(profit) };
    })
    .sort((a, b) => b.units_sold - a.units_sold)
    .slice(0, 15);

  const slow_moving = products
    .map((p) => ({ id: p.id, product_name: p.product_name, quantity: p.quantity, created_at: p.created_at, units_sold: sold.get(p.id)?.units_sold || 0 }))
    .filter((p) => p.units_sold <= 2)
    .sort((a, b) => a.units_sold - b.units_sold || b.quantity - a.quantity)
    .slice(0, 15);

  sendSuccess(res, 'Product report generated successfully.', { best_selling, slow_moving });
});

// GET /api/reports/inventory_report
router.get('/inventory_report', async (req, res) => {
  const t = today();
  const [products, categories] = await Promise.all([L(Product.find().sort({ product_name: 1 })), L(Category.find())]);
  const cats = byId(categories);

  let total = 0;
  const rows = products.map((p) => {
    const stock_value = round2(p.cost_price * p.quantity);
    total += p.cost_price * p.quantity;
    let status = 'Healthy';
    if (p.quantity === 0) status = 'Out Of Stock';
    else if (p.expiry_date && p.expiry_date < t) status = 'Expired';
    else if (p.quantity <= p.minimum_stock) status = 'Low Stock';
    return {
      id: p.id,
      product_name: p.product_name,
      sku: p.sku,
      category_name: cats.get(p.category_id)?.category_name ?? null,
      quantity: p.quantity,
      minimum_stock: p.minimum_stock,
      cost_price: p.cost_price,
      stock_value,
      status,
    };
  });
  sendSuccess(res, 'Inventory report generated successfully.', { products: rows, total_stock_value: round2(total) });
});

// GET /api/reports/customer_report
router.get('/customer_report', async (req, res) => {
  const [customers, stats] = await Promise.all([
    L(Customer.find()),
    Sale.aggregate([
      { $match: { customer_id: { $ne: null } } },
      { $group: { _id: '$customer_id', n: { $sum: 1 }, spent: { $sum: '$grand_total' }, last: { $max: '$sale_date' } } },
    ]),
  ]);
  const map = new Map(stats.map((s) => [s._id, s]));
  const rows = customers
    .map((c) => {
      const s = map.get(c.id);
      return {
        id: c.id,
        customer_name: c.customer_name,
        purchase_count: s ? s.n : 0,
        total_spent: round2(s ? s.spent : 0),
        last_purchase: s ? s.last : null,
      };
    })
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 20);
  sendSuccess(res, 'Customer report generated successfully.', rows);
});

// GET /api/reports/supplier_report
router.get('/supplier_report', async (req, res) => {
  const [suppliers, purchases] = await Promise.all([L(Supplier.find().sort({ id: 1 })), L(Purchase.find())]);
  const rows = suppliers
    .map((s) => {
      const mine = purchases.filter((p) => p.supplier_id === s.id);
      return {
        id: s.id,
        supplier_name: s.supplier_name,
        company_name: s.company_name,
        total_orders: mine.length,
        pending_orders: mine.filter((p) => p.order_status === 'Pending').length,
        total_purchase_amount: round2(mine.reduce((sum, p) => sum + p.total_amount, 0)),
      };
    })
    .sort((a, b) => b.total_purchase_amount - a.total_purchase_amount);
  sendSuccess(res, 'Supplier report generated successfully.', rows);
});

module.exports = router;
