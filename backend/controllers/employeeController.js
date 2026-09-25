const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, buildPaginationResult } = require('../utils/paginate');

// POST /api/employees (admin)
const createEmployee = asyncHandler(async (req, res) => {
  const { employeeId, name, email, password } = req.body;

  const employee = await User.create({
    employeeId,
    name,
    email,
    password,
    role: 'employee',
  });

  res.status(201).json({
    success: true,
    message: 'Employee created successfully.',
    employee,
  });
});

// GET /api/employees (admin) ?search=&status=&page=&limit=
const listEmployees = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const filter = { role: 'employee' };
  if (status && ['active', 'inactive'].includes(status)) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [employees, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    ...buildPaginationResult(employees, total, page, limit),
  });
});

// GET /api/employees/:id (admin)
const getEmployee = asyncHandler(async (req, res) => {
  const employee = await User.findOne({ _id: req.params.id, role: 'employee' });
  if (!employee) throw new AppError('Employee not found.', 404);
  res.status(200).json({ success: true, employee });
});

// PUT /api/employees/:id (admin)
const updateEmployee = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  const employee = await User.findOne({ _id: req.params.id, role: 'employee' });
  if (!employee) throw new AppError('Employee not found.', 404);

  if (name !== undefined) employee.name = name;
  if (email !== undefined) employee.email = email;

  await employee.save();

  res.status(200).json({ success: true, message: 'Employee updated successfully.', employee });
});

// PUT /api/employees/:id/status (admin) - activate/deactivate
const toggleEmployeeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) {
    throw new AppError('Status must be either active or inactive.', 400);
  }

  const employee = await User.findOne({ _id: req.params.id, role: 'employee' });
  if (!employee) throw new AppError('Employee not found.', 404);

  employee.status = status;
  await employee.save();

  res.status(200).json({
    success: true,
    message: `Employee ${status === 'active' ? 'activated' : 'deactivated'} successfully.`,
    employee,
  });
});

// PUT /api/employees/:id/reset-password (admin)
const resetEmployeePassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;

  const employee = await User.findOne({ _id: req.params.id, role: 'employee' });
  if (!employee) throw new AppError('Employee not found.', 404);

  employee.password = newPassword; // hashed by pre-save hook
  await employee.save();

  res.status(200).json({ success: true, message: 'Password reset successfully.' });
});

module.exports = {
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  resetEmployeePassword,
};
