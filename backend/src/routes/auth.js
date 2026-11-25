const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { sendSuccess, fail } = require('../utils/response');
const { requireLogin } = require('../middleware/auth');
const { str, escapeRegex } = require('../utils/helpers');

const regenerate = (req) => new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
const save = (req) => new Promise((resolve, reject) => req.session.save((e) => (e ? reject(e) : resolve())));
const destroy = (req) => new Promise((resolve) => req.session.destroy(() => resolve()));

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const email = str(req.body.email);
  const password = str(req.body.password);
  if (!email || !password) fail('Email and password are required.');

  // MySQL's default collation matched emails case-insensitively; keep that behaviour.
  const user = await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, 'i') }).lean();
  if (!user) fail('Invalid email or password.', 401);
  if (user.status !== 'Active') fail('Your account has been deactivated. Contact admin.', 403);
  if (!(await bcrypt.compare(password, user.password))) fail('Invalid email or password.', 401);

  await regenerate(req);
  req.session.user_id = user.id;
  req.session.role = user.role;
  req.session.name = user.name;
  await save(req);

  await User.updateOne({ id: user.id }, { $set: { last_login: new Date() } });

  sendSuccess(res, 'Login successful.', { id: user.id, name: user.name, email: user.email, role: user.role });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  await destroy(req);
  res.clearCookie('connect.sid');
  sendSuccess(res, 'Logged out successfully.');
});

// GET /api/auth/check_session
router.get('/check_session', (req, res) => {
  if (!req.session || !req.session.user_id) fail('Not authenticated.', 401);
  sendSuccess(res, 'Session active.', {
    id: req.session.user_id,
    name: req.session.name,
    role: req.session.role,
  });
});

// POST /api/auth/change_password
router.post('/change_password', requireLogin, async (req, res) => {
  const current = str(req.body.current_password);
  const next = str(req.body.new_password);
  const confirm = str(req.body.confirm_password);

  if (!current || !next || !confirm) fail('All fields are required.');
  if (next !== confirm) fail('New password and confirmation do not match.');
  if (next.length < 6) fail('New password must be at least 6 characters.');

  const user = await User.findOne({ id: req.session.user_id }).lean();
  if (!user || !(await bcrypt.compare(current, user.password))) fail('Current password is incorrect.', 401);

  const hash = await bcrypt.hash(next, 10);
  await User.updateOne({ id: user.id }, { $set: { password: hash } });
  sendSuccess(res, 'Password changed successfully.');
});

module.exports = router;
