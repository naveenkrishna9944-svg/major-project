const router = require('express').Router();
const { Notification } = require('../models');
const { sendSuccess, fail } = require('../utils/response');
const { requireLogin } = require('../middleware/auth');
const { L } = require('../utils/query');
const { toInt } = require('../utils/helpers');

router.use(requireLogin);

// GET /api/notifications/get_notifications
router.get('/get_notifications', async (req, res) => {
  const uid = req.session.user_id;
  const [notifications, unread] = await Promise.all([
    L(Notification.find({ user_id: uid }).sort({ created_at: -1, id: -1 }).limit(50)),
    Notification.countDocuments({ user_id: uid, is_read: 0 }),
  ]);
  sendSuccess(res, 'Notifications fetched successfully.', { notifications, unread_count: unread });
});

// POST /api/notifications/mark_read   { id }  (no id => mark all)
router.post('/mark_read', async (req, res) => {
  const id = toInt(req.body.id);
  const filter = id > 0 ? { id, user_id: req.session.user_id } : { user_id: req.session.user_id };
  await Notification.updateMany(filter, { $set: { is_read: 1 } });
  sendSuccess(res, 'Notification(s) marked as read.');
});

// POST /api/notifications/delete_notification   { id }
router.post('/delete_notification', async (req, res) => {
  const id = toInt(req.body.id);
  if (id <= 0) fail('Notification id is required.');
  await Notification.deleteOne({ id, user_id: req.session.user_id });
  sendSuccess(res, 'Notification deleted successfully.');
});

module.exports = router;
