const router = require('express').Router();
const { Setting } = require('../models');
const { sendSuccess } = require('../utils/response');
const { requireLogin, requireRole } = require('../middleware/auth');
const { L } = require('../utils/query');
const { str, toFloat } = require('../utils/helpers');

// GET /api/settings/get_settings
router.get('/get_settings', requireLogin, async (req, res) => {
  const settings = await L(Setting.findOne().sort({ id: 1 }));
  sendSuccess(res, 'Settings fetched successfully.', settings);
});

// POST /api/settings/update_settings   (Admin)
router.post('/update_settings', requireRole('Admin'), async (req, res) => {
  const b = req.body;
  const data = {
    store_name: str(b.store_name, 'My Mart'),
    address: str(b.address),
    phone: str(b.phone),
    email: str(b.email),
    currency: str(b.currency, 'PKR'),
    tax_rate: toFloat(b.tax_rate),
    invoice_prefix: str(b.invoice_prefix, 'INV-'),
    theme: b.theme || 'Light',
  };
  const existing = await Setting.findOne().sort({ id: 1 });
  if (existing) {
    existing.set(data);
    await existing.save();
  } else {
    await Setting.create(data);
  }
  sendSuccess(res, 'Settings updated successfully.');
});

module.exports = router;
