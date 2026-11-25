const router = require('express').Router();
const { Product, Category, Employee, Customer, Supplier, Sale, SaleItem } = require('../models');
const { sendSuccess } = require('../utils/response');
const { requireLogin } = require('../middleware/auth');
const { today, addDays, startOfDay, ymd, round2 } = require('../utils/helpers');

const lowStock = { $expr: { $and: [{ $lte: ['$quantity', '$minimum_stock'] }, { $gt: ['$quantity', 0] }] } };

async function salesTotal(range) {
  const match = range ? { sale_date: range } : {};
  const [row] = await Sale.aggregate([{ $match: match }, { $group: { _id: null, t: { $sum: '$grand_total' } } }]);
  return row ? row.t : 0;
}

// Profit = sum((price - cost_price) * quantity) across all sale items
async function totalProfit() {
  const [row] = await SaleItem.aggregate([
    { $lookup: { from: 'products', localField: 'product_id', foreignField: 'id', as: 'p' } },
    { $unwind: '$p' },
    { $group: { _id: null, profit: { $sum: { $multiply: [{ $subtract: ['$price', '$p.cost_price'] }, '$quantity'] } } } },
  ]);
  return row ? row.profit : 0;
}

// GET /api/dashboard/stats
router.get('/stats', requireLogin, async (req, res) => {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // Monday = 0 (MySQL YEARWEEK mode 1)
  const dayStart = startOfDay(today());
  const dayEnd = startOfDay(addDays(1));
  const weekStart = startOfDay(addDays(-dow));
  const weekEnd = startOfDay(addDays(7 - dow));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    total_products, total_categories, total_employees, total_customers, total_suppliers,
    stockAgg, low_stock_count, out_of_stock_count, expiring_count,
    today_sales, weekly_sales, monthly_sales, total_revenue, total_profit,
  ] = await Promise.all([
    Product.countDocuments(),
    Category.countDocuments(),
    Employee.countDocuments({ status: 'Active' }),
    Customer.countDocuments(),
    Supplier.countDocuments(),
    Product.aggregate([{ $group: { _id: null, v: { $sum: { $multiply: ['$cost_price', '$quantity'] } } } }]),
    Product.countDocuments(lowStock),
    Product.countDocuments({ quantity: 0 }),
    Product.countDocuments({ expiry_date: { $ne: null, $lte: addDays(30) } }),
    salesTotal({ $gte: dayStart, $lt: dayEnd }),
    salesTotal({ $gte: weekStart, $lt: weekEnd }),
    salesTotal({ $gte: monthStart, $lt: monthEnd }),
    salesTotal(null),
    totalProfit(),
  ]);

  sendSuccess(res, 'Dashboard stats fetched successfully.', {
    total_products,
    total_categories,
    total_employees,
    total_customers,
    total_suppliers,
    stock_value: round2(stockAgg[0] ? stockAgg[0].v : 0),
    low_stock_count,
    out_of_stock_count,
    expiring_count,
    today_sales: round2(today_sales),
    weekly_sales: round2(weekly_sales),
    monthly_sales: round2(monthly_sales),
    total_revenue: round2(total_revenue),
    total_profit: round2(total_profit),
  });
});

// GET /api/dashboard/charts
router.get('/charts', requireLogin, async (req, res) => {
  // Sales for last 7 days (days without sales are not listed, same as the SQL GROUP BY)
  const since = startOfDay(addDays(-6));
  const recent = await Sale.find({ sale_date: { $gte: since } }).select('sale_date grand_total -_id').lean();
  const perDay = new Map();
  for (const s of recent) {
    const day = ymd(new Date(s.sale_date));
    perDay.set(day, (perDay.get(day) || 0) + s.grand_total);
  }
  const sales_last_7_days = [...perDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, total]) => ({ day, total: round2(total) }));

  // Category distribution
  const [categories, perCategory] = await Promise.all([
    Category.find().sort({ id: 1 }).select('id category_name -_id').lean(),
    Product.aggregate([{ $group: { _id: '$category_id', n: { $sum: 1 } } }]),
  ]);
  const catCount = new Map(perCategory.map((r) => [r._id, r.n]));
  const category_distribution = categories.map((c) => ({
    category_name: c.category_name,
    product_count: catCount.get(c.id) || 0,
  }));

  // Top selling products (by quantity sold)
  const top = await SaleItem.aggregate([
    { $group: { _id: '$product_id', total_sold: { $sum: '$quantity' } } },
    { $sort: { total_sold: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'products', localField: '_id', foreignField: 'id', as: 'p' } },
    { $unwind: '$p' },
    { $project: { _id: 0, product_name: '$p.product_name', total_sold: 1 } },
  ]);

  // Inventory status breakdown
  const todayStr = today();
  const [healthy, low_stock, out_of_stock, expired] = await Promise.all([
    Product.countDocuments({ $expr: { $gt: ['$quantity', '$minimum_stock'] } }),
    Product.countDocuments(lowStock),
    Product.countDocuments({ quantity: 0 }),
    Product.countDocuments({ expiry_date: { $ne: null, $lt: todayStr } }),
  ]);

  sendSuccess(res, 'Charts data fetched successfully.', {
    sales_last_7_days,
    category_distribution,
    top_products: top,
    inventory_status: { healthy, low_stock, out_of_stock, expired },
  });
});

module.exports = router;
