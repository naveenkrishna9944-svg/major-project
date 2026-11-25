const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { User, Employee, Notification, Sale, Purchase, InventoryHistory } = require('../models');
const { sendSuccess, fail } = require('../utils/response');
const { requireLogin, requireRole } = require('../middleware/auth');
const { L } = require('../utils/query');
const { str, toInt, toFloat, isEmail, today, byId, escapeRegex } = require('../utils/helpers');

// GET /api/employees/get_employees
router.get('/get_employees', requireLogin, async (req, res) => {
  const [employees, users] = await Promise.all([
    L(Employee.find().sort({ created_at: -1, id: -1 })),
    L(User.find()),
  ]);
  const map = byId(users);
  const rows = employees
    .filter((e) => map.has(e.user_id)) // INNER JOIN users
    .map((e) => ({ ...e, login_email: map.get(e.user_id).email, role: map.get(e.user_id).role }));
  sendSuccess(res, 'Employees fetched successfully.', rows);
});

// POST /api/employees/add_employee   (Admin)
router.post('/add_employee', requireRole('Admin'), async (req, res) => {
  const b = req.body;
  const full_name = str(b.full_name);
  const email = str(b.email);
  const password = str(b.password);
  const phone = str(b.phone);
  const address = str(b.address);
  const salary = toFloat(b.salary);
  const joining_date = str(b.joining_date) || today();
  const role = b.role || 'Employee';

  if (!full_name || !email || !password) fail('Full name, email, and password are required.');
  if (!isEmail(email)) fail('Invalid email format.');
  if (!['Admin', 'Employee'].includes(role)) fail('Failed to add employee.', 500);
  if (await User.exists({ email: new RegExp(`^${escapeRegex(email)}$`, 'i') })) {
    fail('A user with this email already exists.');
  }

  let user;
  try {
    user = await User.create({ name: full_name, email, password: await bcrypt.hash(password, 10), role });
    const emp = await Employee.create({
      user_id: user.id,
      employee_code: `EMP-${String(user.id).padStart(3, '0')}`,
      full_name, phone, email, address, salary, joining_date,
    });
    sendSuccess(res, 'Employee added successfully.', { id: emp.id });
  } catch (err) {
    if (user) await User.deleteOne({ id: user.id }); // rollback
    console.error(err);
    fail('Failed to add employee.', 500);
  }
});

// POST /api/employees/update_employee   (Admin)
router.post('/update_employee', requireRole('Admin'), async (req, res) => {
  const id = toInt(req.body.id);
  const full_name = str(req.body.full_name);
  if (id <= 0 || !full_name) fail('Employee id and name are required.');
  await Employee.updateOne({ id }, {
    $set: {
      full_name,
      phone: str(req.body.phone),
      address: str(req.body.address),
      salary: toFloat(req.body.salary),
      status: req.body.status || 'Active',
    },
  }, { runValidators: true });
  sendSuccess(res, 'Employee updated successfully.');
});

// POST /api/employees/delete_employee   (Admin) - removes the login too
router.post('/delete_employee', requireRole('Admin'), async (req, res) => {
  const id = toInt(req.body.id);
  if (id <= 0) fail('Employee id is required.');
  const emp = await Employee.findOne({ id }).lean();
  if (!emp) fail('Employee not found.', 404);

  const uid = emp.user_id;
  await User.deleteOne({ id: uid });
  // ON DELETE CASCADE / SET NULL
  await Promise.all([
    Employee.deleteMany({ user_id: uid }),
    Notification.deleteMany({ user_id: uid }),
    Sale.updateMany({ employee_id: id }, { $set: { employee_id: null } }),
    Purchase.updateMany({ created_by: uid }, { $set: { created_by: null } }),
    InventoryHistory.updateMany({ performed_by: uid }, { $set: { performed_by: null } }),
  ]);
  sendSuccess(res, 'Employee deleted successfully.');
});

module.exports = router;
