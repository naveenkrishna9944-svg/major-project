const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const router = require('express').Router();
const multer = require('multer');
const {
  Product, Category, Supplier, InventoryHistory, SaleItem, PurchaseItem,
  ReorderRequest, ExpiryTracking, Discount,
} = require('../models');
const { sendSuccess, fail } = require('../utils/response');
const { requireLogin } = require('../middleware/auth');
const { L } = require('../utils/query');
const { str, toInt, toFloat, escapeRegex, byId } = require('../utils/helpers');

router.use(requireLogin);

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'products');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp'];

/** Validates + stores the uploaded image, returns its public path (e.g. "uploads/products/prod_x.png"). */
async function storeImage(file, { enforceSize }) {
  const ext = path.extname(file.originalname).slice(1).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) fail('Invalid image format. Allowed: jpg, jpeg, png, webp.');
  if (enforceSize && file.size > 3 * 1024 * 1024) fail('Image size must be under 3MB.');
  const filename = `prod_${Date.now().toString(16)}${crypto.randomBytes(3).toString('hex')}.${ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), file.buffer);
  return `uploads/products/${filename}`;
}

const nullable = (v) => {
  const s = str(v);
  return s === '' ? null : s;
};

/** Reads + coerces the multipart form exactly like the PHP $_POST handling. */
function productFields(b) {
  return {
    product_name: str(b.product_name),
    sku: str(b.sku),
    barcode: str(b.barcode),
    category_id: b.category_id ? toInt(b.category_id) || null : null,
    supplier_id: b.supplier_id ? toInt(b.supplier_id) || null : null,
    brand: str(b.brand),
    cost_price: toFloat(b.cost_price),
    selling_price: toFloat(b.selling_price),
    quantity: toInt(b.quantity),
    minimum_stock: b.minimum_stock === undefined ? 5 : toInt(b.minimum_stock),
    unit: str(b.unit) || 'pcs',
    manufacturing_date: nullable(b.manufacturing_date),
    expiry_date: nullable(b.expiry_date),
    description: str(b.description),
  };
}

function validate(d) {
  if (!d.product_name || !d.sku || !d.barcode) fail('Product name, SKU, and barcode are required.');
  if (d.cost_price < 0 || d.selling_price < 0 || d.quantity < 0) fail('Prices and quantity cannot be negative.');
}

function stockStatus(p) {
  const qty = p.quantity;
  if (qty === 0) return 'Out Of Stock';
  // PHP: strtotime($expiry) < time()  -> expired once the expiry day has started
  if (p.expiry_date) {
    const [y, m, d] = p.expiry_date.split('-').map(Number);
    if (new Date(y, m - 1, d) < new Date()) return 'Expired';
  }
  if (qty <= p.minimum_stock) return 'Low Stock';
  return 'Healthy';
}

// GET /api/products/get_products?search=&category_id=
router.get('/get_products', async (req, res) => {
  const search = str(req.query.search);
  const category = toInt(req.query.category_id);

  const filter = {};
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ product_name: rx }, { sku: rx }, { barcode: rx }, { brand: rx }];
  }
  if (category > 0) filter.category_id = category;

  const [products, categories, suppliers] = await Promise.all([
    L(Product.find(filter).sort({ created_at: -1, id: -1 })),
    L(Category.find()),
    L(Supplier.find()),
  ]);
  const cats = byId(categories);
  const sups = byId(suppliers);

  sendSuccess(res, 'Products fetched successfully.', products.map((p) => ({
    ...p,
    category_name: cats.get(p.category_id)?.category_name ?? null,
    supplier_name: sups.get(p.supplier_id)?.supplier_name ?? null,
    stock_status: stockStatus(p),
  })));
});

// GET /api/products/get_product?id=
router.get('/get_product', async (req, res) => {
  const id = toInt(req.query.id);
  if (id <= 0) fail('Product id is required.');
  const p = await L(Product.findOne({ id }));
  if (!p) fail('Product not found.', 404);
  const [cat, sup] = await Promise.all([
    p.category_id ? Category.findOne({ id: p.category_id }).lean() : null,
    p.supplier_id ? Supplier.findOne({ id: p.supplier_id }).lean() : null,
  ]);
  sendSuccess(res, 'Product fetched successfully.', {
    ...p,
    category_name: cat?.category_name ?? null,
    supplier_name: sup?.supplier_name ?? null,
  });
});

// POST /api/products/add_product   (multipart/form-data, optional "image" file)
router.post('/add_product', upload.single('image'), async (req, res) => {
  const d = productFields(req.body);
  validate(d);

  if (await Product.exists({ $or: [{ sku: d.sku }, { barcode: d.barcode }] })) {
    fail('A product with this SKU or barcode already exists.');
  }

  let image = null;
  if (req.file) image = await storeImage(req.file, { enforceSize: true });

  const p = await Product.create({ ...d, image });
  sendSuccess(res, 'Product added successfully.', { id: p.id });
});

// POST /api/products/update_product   (multipart/form-data, optional "image" file)
router.post('/update_product', upload.single('image'), async (req, res) => {
  const id = toInt(req.body.id);
  if (id <= 0) fail('Product id is required.');
  const d = productFields(req.body);
  validate(d);

  if (await Product.exists({ id: { $ne: id }, $or: [{ sku: d.sku }, { barcode: d.barcode }] })) {
    fail('Another product with this SKU or barcode already exists.');
  }

  const update = { ...d };
  if (req.file) update.image = await storeImage(req.file, { enforceSize: false });

  await Product.updateOne({ id }, { $set: update });
  sendSuccess(res, 'Product updated successfully.');
});

// POST /api/products/delete_product   { id }
router.post('/delete_product', async (req, res) => {
  const id = toInt(req.body.id ?? req.query.id);
  if (id <= 0) fail('Product id is required.');
  await Product.deleteOne({ id });
  // ON DELETE CASCADE
  await Promise.all([
    InventoryHistory.deleteMany({ product_id: id }),
    SaleItem.deleteMany({ product_id: id }),
    PurchaseItem.deleteMany({ product_id: id }),
    ReorderRequest.deleteMany({ product_id: id }),
    ExpiryTracking.deleteMany({ product_id: id }),
    Discount.deleteMany({ product_id: id }),
  ]);
  sendSuccess(res, 'Product deleted successfully.');
});

module.exports = router;
