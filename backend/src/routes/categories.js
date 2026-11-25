const router = require('express').Router();
const { Category, Product } = require('../models');
const { sendSuccess, fail } = require('../utils/response');
const { requireLogin } = require('../middleware/auth');
const { L } = require('../utils/query');
const { str, toInt } = require('../utils/helpers');

router.use(requireLogin);

// GET /api/categories/get_categories
router.get('/get_categories', async (req, res) => {
  const [categories, counts] = await Promise.all([
    L(Category.find().sort({ created_at: -1, id: -1 })),
    Product.aggregate([{ $group: { _id: '$category_id', n: { $sum: 1 } } }]),
  ]);
  const map = new Map(counts.map((r) => [r._id, r.n]));
  sendSuccess(res, 'Categories fetched successfully.', categories.map((c) => ({ ...c, product_count: map.get(c.id) || 0 })));
});

// POST /api/categories/add_category
router.post('/add_category', async (req, res) => {
  const name = str(req.body.category_name);
  const desc = str(req.body.description);
  if (!name) fail('Category name is required.');
  const c = await Category.create({ category_name: name, description: desc });
  sendSuccess(res, 'Category added successfully.', { id: c.id });
});

// POST /api/categories/update_category
router.post('/update_category', async (req, res) => {
  const id = toInt(req.body.id);
  const name = str(req.body.category_name);
  const desc = str(req.body.description);
  const status = req.body.status || 'Active';
  if (id <= 0 || !name) fail('Category id and name are required.');
  await Category.updateOne({ id }, { $set: { category_name: name, description: desc, status } }, { runValidators: true });
  sendSuccess(res, 'Category updated successfully.');
});

// POST /api/categories/delete_category
router.post('/delete_category', async (req, res) => {
  const id = toInt(req.body.id);
  if (id <= 0) fail('Category id is required.');
  if ((await Product.countDocuments({ category_id: id })) > 0) fail('Cannot delete category because products exist.');
  await Category.deleteOne({ id });
  sendSuccess(res, 'Category deleted successfully.');
});

module.exports = router;
