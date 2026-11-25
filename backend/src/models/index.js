const { makeModel, Status } = require('./factory');

/* Foreign keys are stored as the referenced numeric `id` (null when unset), mirroring the SQL schema. */
const fk = { type: Number, default: null };

const User = makeModel('User', 'users', {
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Employee'], default: 'Employee' },
  status: Status,
  last_login: { type: Date, default: null },
});

const Employee = makeModel('Employee', 'employees', {
  user_id: { type: Number, required: true, index: true },
  employee_code: { type: String, required: true, unique: true },
  full_name: { type: String, required: true },
  profile_image: { type: String, default: null },
  phone: { type: String, default: null },
  email: { type: String, default: null },
  address: { type: String, default: null },
  salary: { type: Number, default: 0 },
  joining_date: { type: String, default: null }, // 'YYYY-MM-DD'
  status: Status,
});

const Category = makeModel('Category', 'categories', {
  category_name: { type: String, required: true },
  description: { type: String, default: null },
  image: { type: String, default: null },
  status: Status,
});

const Supplier = makeModel('Supplier', 'suppliers', {
  supplier_name: { type: String, required: true },
  company_name: { type: String, default: null },
  phone: { type: String, default: null },
  email: { type: String, default: null },
  address: { type: String, default: null },
  city: { type: String, default: null },
  country: { type: String, default: null },
  status: Status,
  notes: { type: String, default: null },
});

const Customer = makeModel('Customer', 'customers', {
  customer_name: { type: String, required: true },
  phone: { type: String, default: null },
  email: { type: String, default: null },
  address: { type: String, default: null },
  city: { type: String, default: null },
  notes: { type: String, default: null },
});

const Product = makeModel('Product', 'products', {
  category_id: { ...fk, index: true },
  supplier_id: { ...fk, index: true },
  product_name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  barcode: { type: String, required: true, unique: true },
  brand: { type: String, default: null },
  image: { type: String, default: null },
  cost_price: { type: Number, required: true, default: 0, min: 0 },
  selling_price: { type: Number, required: true, default: 0, min: 0 },
  quantity: { type: Number, required: true, default: 0, min: 0 },
  minimum_stock: { type: Number, required: true, default: 5 },
  unit: { type: String, default: 'pcs' },
  manufacturing_date: { type: String, default: null }, // 'YYYY-MM-DD'
  expiry_date: { type: String, default: null },        // 'YYYY-MM-DD'
  description: { type: String, default: null },
  status: Status,
});

const InventoryHistory = makeModel('InventoryHistory', 'inventory_history', {
  product_id: { type: Number, required: true, index: true },
  previous_quantity: { type: Number, required: true },
  quantity_changed: { type: Number, required: true },
  new_quantity: { type: Number, required: true },
  action_type: {
    type: String,
    enum: ['Stock In', 'Stock Out', 'Sale', 'Purchase', 'Adjustment'],
    required: true,
  },
  reference_id: fk,
  performed_by: fk,
}, { updatedAt: false });

const Sale = makeModel('Sale', 'sales', {
  invoice_number: { type: String, required: true, unique: true },
  customer_id: fk,
  employee_id: fk,
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  grand_total: { type: Number, default: 0 },
  payment_method: { type: String, enum: ['Cash', 'Card', 'Online'], default: 'Cash' },
  sale_date: { type: Date, default: Date.now, index: true },
}, { updatedAt: false });

const SaleItem = makeModel('SaleItem', 'sale_items', {
  sale_id: { type: Number, required: true, index: true },
  product_id: { type: Number, required: true, index: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  total: { type: Number, required: true },
}, { timestamps: false });

const Purchase = makeModel('Purchase', 'purchases', {
  purchase_number: { type: String, required: true, unique: true },
  supplier_id: { ...fk, index: true },
  total_amount: { type: Number, default: 0 },
  payment_status: { type: String, enum: ['Paid', 'Unpaid', 'Partial'], default: 'Unpaid' },
  order_status: { type: String, enum: ['Pending', 'Received', 'Cancelled'], default: 'Pending' },
  created_by: fk,
  purchase_date: { type: Date, default: Date.now },
}, { updatedAt: false });

const PurchaseItem = makeModel('PurchaseItem', 'purchase_items', {
  purchase_id: { type: Number, required: true, index: true },
  product_id: { type: Number, required: true, index: true },
  quantity: { type: Number, required: true },
  purchase_price: { type: Number, required: true },
  total: { type: Number, required: true },
}, { timestamps: false });

const ReorderRequest = makeModel('ReorderRequest', 'reorder_requests', {
  product_id: { type: Number, required: true, index: true },
  supplier_id: fk,
  requested_quantity: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Received', 'Cancelled'], default: 'Pending' },
  created_by: fk,
});

const Notification = makeModel('Notification', 'notifications', {
  user_id: { ...fk, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['Low Stock', 'Out Of Stock', 'Expiry', 'Purchase', 'Sales', 'System'],
    required: true,
  },
  is_read: { type: Number, enum: [0, 1], default: 0 },
}, { updatedAt: false });

const ExpiryTracking = makeModel('ExpiryTracking', 'expiry_tracking', {
  product_id: { type: Number, required: true, index: true },
  expiry_date: { type: String, required: true },
  quantity: { type: Number, required: true },
  estimated_loss: { type: Number, default: 0 },
  status: { type: String, enum: ['Expired', 'Expiring Soon', 'Safe'], default: 'Safe' },
}, { updatedAt: false });

const Discount = makeModel('Discount', 'discounts', {
  product_id: { type: Number, required: true, index: true },
  discount_type: { type: String, enum: ['Percentage', 'Fixed'], required: true },
  discount_value: { type: Number, required: true },
  start_date: { type: String, default: null },
  end_date: { type: String, default: null },
  status: Status,
}, { updatedAt: false });

const Setting = makeModel('Setting', 'settings', {
  store_name: { type: String, default: 'My Mart' },
  logo: { type: String, default: null },
  address: { type: String, default: null },
  phone: { type: String, default: null },
  email: { type: String, default: null },
  currency: { type: String, default: 'PKR' },
  tax_rate: { type: Number, default: 5 },
  invoice_prefix: { type: String, default: 'INV-' },
  theme: { type: String, enum: ['Light', 'Dark'], default: 'Light' },
});

module.exports = {
  User, Employee, Category, Supplier, Customer, Product, InventoryHistory,
  Sale, SaleItem, Purchase, PurchaseItem, ReorderRequest, Notification,
  ExpiryTracking, Discount, Setting,
};
