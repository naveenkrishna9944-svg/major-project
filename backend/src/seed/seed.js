/**
 * Loads the same demo data as database/database.sql did for MySQL.
 *   npm run seed        (re-running wipes and recreates the demo data, like DROP DATABASE did)
 *
 * Demo dates (sales, purchases, expiries) are shifted so that the original "today" in the SQL
 * file (2026-07-20) becomes the day you run the seed. That keeps the dashboard, low-stock and
 * expiry screens meaningful instead of showing everything as expired.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MONGO_URI } = require('../config/env');
const M = require('../models');
const { Counter } = require('../utils/counter');

const REFERENCE_DAY = new Date(2026, 6, 20); // 2026-07-20 (month is 0-based)
const startOfToday = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const SHIFT_MS = startOfToday().getTime() - REFERENCE_DAY.getTime();

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
function shiftDate(s) {
  const d = parse(s);
  d.setDate(d.getDate() + Math.round(SHIFT_MS / 86400000));
  return d;
}
/** 'YYYY-MM-DD' -> shifted 'YYYY-MM-DD' */
const shiftStr = (s) => (s ? fmt(shiftDate(s)) : null);
/** 'YYYY-MM-DD HH:MM:SS' -> shifted Date */
const sdt = (s) => {
  const [date, time = '00:00:00'] = s.split(' ');
  const d = shiftDate(date);
  const [h, mi, se] = time.split(':').map(Number);
  d.setHours(h, mi, se, 0);
  return d;
};

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${mongoose.connection.name}. Resetting collections...`);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(M).map((m) => m.init()));

  const adminHash = await bcrypt.hash('admin123', 10);
  const employeeHash = await bcrypt.hash('employee123', 10);

  const ins = async (Model, rows) => {
    const withIds = rows.map((r, i) => ({ id: i + 1, ...r }));
    await Model.insertMany(withIds);
    await Counter.updateOne({ _id: Model.collection.name }, { $set: { seq: withIds.length } }, { upsert: true });
  };

  await ins(M.Setting, [{
    store_name: 'My Mart', address: '123 Main Street, Faisalabad', phone: '+92-300-0000000',
    email: 'store@mart.com', currency: 'PKR', tax_rate: 5.0, invoice_prefix: 'INV-', theme: 'Light',
  }]);

  await ins(M.User, [
    { name: 'Admin User', email: 'admin@mart.com', password: adminHash, role: 'Admin', status: 'Active' },
    { name: 'John Cashier', email: 'employee@mart.com', password: employeeHash, role: 'Employee', status: 'Active' },
    { name: 'Fatima Noor', email: 'fatima@mart.com', password: employeeHash, role: 'Employee', status: 'Active' },
    { name: 'Hamza Iqbal', email: 'hamza@mart.com', password: employeeHash, role: 'Employee', status: 'Active' },
  ]);

  await ins(M.Employee, [
    { user_id: 2, employee_code: 'EMP-001', full_name: 'John Cashier', phone: '+92-300-1111111', email: 'employee@mart.com', address: 'Susan Road, Faisalabad', salary: 35000, joining_date: '2025-01-15', status: 'Active' },
    { user_id: 3, employee_code: 'EMP-002', full_name: 'Fatima Noor', phone: '+92-300-7777777', email: 'fatima@mart.com', address: 'Model Town, Faisalabad', salary: 32000, joining_date: '2025-03-10', status: 'Active' },
    { user_id: 4, employee_code: 'EMP-003', full_name: 'Hamza Iqbal', phone: '+92-300-8888888', email: 'hamza@mart.com', address: 'Peoples Colony, Faisalabad', salary: 30000, joining_date: '2025-06-01', status: 'Active' },
  ]);

  await ins(M.Category, [
    ['Grocery', 'Everyday grocery items'], ['Dairy', 'Milk and dairy products'], ['Beverages', 'Drinks and beverages'],
    ['Snacks', 'Chips and snacks'], ['Household', 'Household essentials'], ['Bakery', 'Fresh baked goods'],
    ['Personal Care', 'Hygiene and personal care items'], ['Frozen Foods', 'Frozen meals and ingredients'],
  ].map(([category_name, description]) => ({ category_name, description, status: 'Active' })));

  await ins(M.Supplier, [
    ['Ahmed Raza', 'ABC Traders', '+92-300-2222222', 'abc@traders.com', 'Susan Road', 'Faisalabad', 'Primary grocery and rice supplier.'],
    ['Bilal Sheikh', 'Fresh Foods Ltd', '+92-300-3333333', 'contact@freshfoods.com', 'Ferozepur Road', 'Lahore', 'Dairy and beverages, weekly delivery.'],
    ['Kamran Malik', 'Daily Needs Supplier', '+92-300-4444444', 'sales@dailyneeds.com', 'Tariq Road', 'Karachi', 'Household and personal care items.'],
    ['Hina Aslam', 'GoldenCrust Bakers', '+92-300-5555555', 'orders@goldencrust.com', 'Model Town', 'Faisalabad', 'Fresh bakery items, daily delivery.'],
    ['Usman Farooq', 'ChillPack Frozen Foods', '+92-300-6666666', 'usman@chillpack.com', 'Cold Storage Zone', 'Lahore', 'Frozen goods supplier, cold chain logistics.'],
  ].map(([supplier_name, company_name, phone, email, address, city, notes]) =>
    ({ supplier_name, company_name, phone, email, address, city, country: 'Pakistan', status: 'Active', notes })));

  await ins(M.Customer, [
    ['Walk-in Customer', null, null, null, null, 'Default customer for POS sales without registration.'],
    ['Ali Raza', '+92-301-1111111', 'ali@example.com', 'Street 4, Susan Road', 'Faisalabad', 'Regular customer, prefers cash.'],
    ['Sara Khan', '+92-301-2222222', 'sara@example.com', 'DHA Phase 5', 'Lahore', 'Buys in bulk for a small cafe.'],
    ['Bilquis Fatima', '+92-301-3333333', 'bilquis@example.com', 'Gulshan-e-Iqbal', 'Karachi', null],
    ['Zeeshan Tariq', '+92-301-4444444', 'zeeshan@example.com', 'Peoples Colony', 'Faisalabad', 'Prefers card payment.'],
    ['Mahnoor Ejaz', '+92-301-5555555', 'mahnoor@example.com', 'Johar Town', 'Lahore', null],
  ].map(([customer_name, phone, email, address, city, notes]) => ({ customer_name, phone, email, address, city, notes })));

  // category_id, supplier_id, name, sku, barcode, brand, cost, sell, qty, min, unit, mfg, expiry
  const products = [
    [2, 2, 'Fresh Milk 1L', 'SKU-MILK-1L', 'BC1000000001', 'DairyPure', 1.20, 2.00, 4, 20, 'ltr', '2026-07-15', '2026-07-25'],
    [2, 2, 'Greek Yogurt 500g', 'SKU-YOG-500', 'BC1000000008', 'DairyPure', 1.80, 2.90, 35, 15, 'pcs', '2026-07-10', '2026-08-05'],
    [2, 2, 'Cheddar Cheese Block 200g', 'SKU-CHED-200', 'BC1000000009', 'DairyPure', 2.50, 3.90, 22, 10, 'pcs', '2026-06-20', '2026-12-20'],
    [2, 2, 'Butter 250g', 'SKU-BUTR-250', 'BC1000000010', 'DairyPure', 2.00, 3.20, 40, 15, 'pcs', '2026-06-01', '2026-11-01'],
    [1, 1, 'Basmati Rice 5kg', 'SKU-RICE-5KG', 'BC1000000002', 'Falak', 6.50, 9.00, 60, 15, 'bag', '2026-01-01', '2027-01-01'],
    [1, 1, 'White Flour 10kg', 'SKU-FLOUR-10KG', 'BC1000000011', 'Sunrise', 5.00, 7.50, 45, 12, 'bag', '2026-02-01', '2026-12-01'],
    [1, 1, 'Cooking Oil 5L', 'SKU-OIL-5L', 'BC1000000012', 'Dalda', 8.00, 11.50, 30, 10, 'btl', '2026-03-01', '2027-03-01'],
    [1, 1, 'Red Lentils 1kg', 'SKU-LENT-1KG', 'BC1000000013', 'Falak', 1.50, 2.30, 70, 20, 'bag', '2026-02-15', '2027-02-15'],
    [1, 1, 'Sugar 5kg', 'SKU-SUGAR-5KG', 'BC1000000014', 'Al-Arabia', 3.50, 5.00, 55, 15, 'bag', '2026-01-20', '2027-01-20'],
    [6, 4, 'White Bread', 'SKU-BREAD-01', 'BC1000000003', 'GoldenCrust', 0.60, 1.20, 0, 10, 'pcs', '2026-07-16', '2026-07-20'],
    [6, 4, 'Brown Bread', 'SKU-BREAD-02', 'BC1000000015', 'GoldenCrust', 0.70, 1.35, 18, 10, 'pcs', '2026-07-17', '2026-07-22'],
    [6, 4, 'Chocolate Croissant', 'SKU-CROIS-01', 'BC1000000016', 'GoldenCrust', 0.90, 1.60, 6, 10, 'pcs', '2026-07-17', '2026-07-21'],
    [4, 3, 'Potato Chips 150g', 'SKU-CHIPS-01', 'BC1000000004', 'Crispo', 0.80, 1.50, 120, 25, 'pcs', '2026-05-01', '2026-11-01'],
    [4, 3, 'Chocolate Cookies 200g', 'SKU-COOK-200', 'BC1000000017', 'SweetBite', 1.00, 1.80, 65, 20, 'pcs', '2026-04-15', '2026-10-15'],
    [4, 3, 'Salted Peanuts 250g', 'SKU-PEAN-250', 'BC1000000018', 'Crispo', 1.10, 1.90, 3, 15, 'pcs', '2026-04-01', '2026-10-01'],
    [3, 2, 'Cola Soft Drink 1.5L', 'SKU-COLA-15', 'BC1000000005', 'FizzUp', 0.90, 1.75, 85, 20, 'btl', '2026-04-01', '2026-12-01'],
    [3, 2, 'Orange Juice 1L', 'SKU-OJ-1L', 'BC1000000019', 'FreshSqueeze', 1.30, 2.20, 28, 15, 'btl', '2026-06-25', '2026-08-10'],
    [3, 2, 'Mineral Water 1.5L', 'SKU-WATER-15', 'BC1000000020', 'AquaPure', 0.30, 0.60, 150, 40, 'btl', '2026-01-01', '2027-06-01'],
    [3, 2, 'Green Tea Box (25 bags)', 'SKU-TEA-25', 'BC1000000021', 'Lipton', 1.60, 2.60, 40, 15, 'box', '2026-01-01', '2027-06-01'],
    [5, 3, 'Bath Soap', 'SKU-SOAP-01', 'BC1000000006', 'PureClean', 0.40, 0.90, 200, 30, 'pcs', '2026-01-01', '2028-01-01'],
    [5, 3, 'Dish Wash Liquid 500ml', 'SKU-DISH-500', 'BC1000000022', 'PureClean', 0.90, 1.60, 50, 20, 'btl', '2026-01-01', '2027-06-01'],
    [5, 3, 'Laundry Detergent 1kg', 'SKU-DET-1KG', 'BC1000000023', 'Surf', 2.20, 3.50, 38, 15, 'bag', '2026-01-01', '2027-12-01'],
    [7, 3, 'Shampoo 200ml', 'SKU-SHAMP-01', 'BC1000000007', 'SilkyHair', 1.50, 2.80, 8, 15, 'btl', '2026-02-01', '2027-06-01'],
    [7, 3, 'Toothpaste 100g', 'SKU-TOOTH-100', 'BC1000000024', 'FreshMint', 0.70, 1.30, 60, 20, 'pcs', '2026-01-01', '2027-12-01'],
    [8, 5, 'Frozen Chicken Nuggets 500g', 'SKU-NUGG-500', 'BC1000000025', 'ChillPack', 2.80, 4.20, 25, 12, 'pack', '2026-05-01', '2026-11-01'],
  ];
  await ins(M.Product, products.map(([category_id, supplier_id, product_name, sku, barcode, brand, cost_price, selling_price, quantity, minimum_stock, unit, mfg, exp]) => ({
    category_id, supplier_id, product_name, sku, barcode, brand, cost_price, selling_price, quantity, minimum_stock, unit,
    manufacturing_date: shiftStr(mfg), expiry_date: shiftStr(exp), status: 'Active',
  })));

  await ins(M.Purchase, [
    ['PO-20260701-AAA001', 1, 585.00, 'Paid', 'Received', 1, '2026-07-01 10:00:00'],
    ['PO-20260705-BBB002', 2, 210.00, 'Paid', 'Received', 1, '2026-07-05 11:30:00'],
    ['PO-20260718-CCC003', 3, 96.00, 'Unpaid', 'Pending', 1, '2026-07-18 09:15:00'],
  ].map(([purchase_number, supplier_id, total_amount, payment_status, order_status, created_by, d]) =>
    ({ purchase_number, supplier_id, total_amount, payment_status, order_status, created_by, purchase_date: sdt(d) })));

  await ins(M.PurchaseItem, [
    [1, 5, 60, 6.50, 390.00], [1, 9, 55, 3.50, 192.50],
    [2, 1, 50, 1.20, 60.00], [2, 2, 35, 1.80, 63.00], [2, 16, 85, 0.90, 76.50],
    [3, 21, 40, 0.90, 36.00], [3, 23, 8, 1.50, 12.00], [3, 15, 40, 1.10, 44.00],
  ].map(([purchase_id, product_id, quantity, purchase_price, total]) => ({ purchase_id, product_id, quantity, purchase_price, total })));

  await ins(M.Sale, [
    ['INV-20260714-S0001', 2, 1, 15.30, 0.00, 0.77, 16.07, 'Cash', '2026-07-14 10:15:00'],
    ['INV-20260715-S0002', 3, 2, 42.80, 2.00, 2.04, 42.84, 'Card', '2026-07-15 14:20:00'],
    ['INV-20260716-S0003', 1, 1, 8.50, 0.00, 0.43, 8.93, 'Cash', '2026-07-16 09:05:00'],
    ['INV-20260717-S0004', 4, 3, 27.60, 1.50, 1.31, 27.41, 'Online', '2026-07-17 16:40:00'],
    ['INV-20260718-S0005', 1, 2, 12.90, 0.00, 0.65, 13.55, 'Cash', '2026-07-18 11:00:00'],
    ['INV-20260719-S0006', 5, 1, 33.20, 3.00, 1.51, 31.71, 'Card', '2026-07-19 08:30:00'],
  ].map(([invoice_number, customer_id, employee_id, subtotal, discount, tax, grand_total, payment_method, d]) =>
    ({ invoice_number, customer_id, employee_id, subtotal, discount, tax, grand_total, payment_method, sale_date: sdt(d) })));

  await ins(M.SaleItem, [
    [1, 13, 4, 1.50, 6.00], [1, 16, 3, 1.75, 5.25], [1, 20, 5, 0.90, 4.50],
    [2, 5, 2, 9.00, 18.00], [2, 7, 1, 11.50, 11.50], [2, 19, 5, 2.60, 13.00],
    [3, 20, 6, 0.90, 5.40], [3, 24, 1, 1.30, 1.30], [3, 13, 1, 1.50, 1.50],
    [4, 3, 3, 3.90, 11.70], [4, 4, 2, 3.20, 6.40], [4, 17, 3, 2.20, 6.60], [4, 2, 1, 2.90, 2.90],
    [5, 21, 4, 1.60, 6.40], [5, 22, 1, 3.50, 3.50], [5, 14, 1, 1.80, 1.80], [5, 20, 1, 0.90, 0.90],
    [6, 25, 4, 4.20, 16.80], [6, 11, 2, 1.35, 2.70], [6, 18, 3, 0.60, 1.80], [6, 13, 8, 1.50, 12.00],
  ].map(([sale_id, product_id, quantity, price, total]) => ({ sale_id, product_id, quantity, price, total })));

  await ins(M.InventoryHistory, [
    [1, 24, -20, 4, 'Sale', 1], [10, 20, -20, 0, 'Sale', 2], [15, 18, -15, 3, 'Sale', 1], [23, 10, -2, 8, 'Adjustment', 1],
  ].map(([product_id, previous_quantity, quantity_changed, new_quantity, action_type, performed_by]) =>
    ({ product_id, previous_quantity, quantity_changed, new_quantity, action_type, performed_by })));

  await ins(M.Notification, [
    [1, 'Low Stock Alert', 'Fresh Milk 1L stock is below minimum level.', 'Low Stock', 0],
    [1, 'Out of Stock', 'White Bread is now unavailable.', 'Out Of Stock', 0],
    [1, 'Expiry Alert', 'Chocolate Croissant expires within 7 days.', 'Expiry', 0],
    [1, 'Purchase Received', 'Purchase order PO-20260701-AAA001 has been received and stock updated.', 'Purchase', 1],
    [1, 'Daily Summary', "Yesterday's sales reached $58.93 across 3 invoices.", 'Sales', 1],
    [2, 'Low Stock Alert', 'Salted Peanuts 250g stock is below minimum level.', 'Low Stock', 0],
  ].map(([user_id, title, message, type, is_read], i) => ({
    user_id, title, message, type, is_read,
    created_at: new Date(Date.now() - (6 - i) * 3600e3), // oldest first, newest last
  })));

  await ins(M.ExpiryTracking, [
    [1, '2026-07-25', 4, 4.80, 'Expiring Soon'], [12, '2026-07-21', 6, 5.40, 'Expiring Soon'],
    [10, '2026-07-20', 0, 0.00, 'Expired'], [17, '2026-08-10', 28, 36.40, 'Safe'],
  ].map(([product_id, expiry_date, quantity, estimated_loss, status]) => ({ product_id, expiry_date: shiftStr(expiry_date), quantity, estimated_loss, status })));

  await ins(M.Discount, [
    [12, 'Percentage', 15, '2026-07-17', '2026-07-21', 'Active'],
    [15, 'Percentage', 20, '2026-07-16', '2026-07-20', 'Active'],
  ].map(([product_id, discount_type, discount_value, s, e, status]) => ({ product_id, discount_type, discount_value, start_date: shiftStr(s), end_date: shiftStr(e), status })));

  console.log('Seed complete.');
  console.log('  Admin     : admin@mart.com    / admin123');
  console.log('  Employee  : employee@mart.com / employee123');
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
