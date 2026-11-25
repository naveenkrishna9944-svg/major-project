/**
 * Equivalent of backend/middleware/auth.php
 *   requireLogin         -> any logged-in user
 *   requireRole('Admin') -> admin only
 */
const requireLogin = (req, res, next) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ status: false, message: 'Unauthorized. Please log in.' });
  }
  next();
};

const requireRole = (role) => (req, res, next) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ status: false, message: 'Unauthorized. Please log in.' });
  }
  if (req.session.role !== role) {
    return res.status(403).json({
      status: false,
      message: 'Forbidden. You do not have permission to perform this action.',
    });
  }
  next();
};

module.exports = { requireLogin, requireRole };
