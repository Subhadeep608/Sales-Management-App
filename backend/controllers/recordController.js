const Record = require('../models/Record');
const Import = require('../models/Import');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const logActivity = require('../utils/activityLogger');
const { getPagination, buildPaginationResult } = require('../utils/paginate');

const MANUAL_ENTRY_FILE_NAME = 'Manually Added Records';

// GET /api/records (admin) ?search=&status=&city=&product=&assignedTo=&unassigned=true&importBatch=&page=&limit=
const listRecords = asyncHandler(async (req, res) => {
  const { search, status, city, product, assignedTo, unassigned, importBatch } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const filter = {};
  if (status) filter.status = status;
  if (city) filter.city = { $regex: city, $options: 'i' };
  if (product) filter.product = { $regex: product, $options: 'i' };
  if (importBatch) filter.importBatch = importBatch;
  if (unassigned === 'true') filter.assignedTo = null;
  else if (assignedTo) filter.assignedTo = assignedTo;

  if (search) {
    filter.$or = [
      { customerName: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [records, total] = await Promise.all([
    Record.find(filter)
      .populate('assignedTo', 'name employeeId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Record.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, ...buildPaginationResult(records, total, page, limit) });
});

// GET /api/records/:id (admin)
const getRecord = asyncHandler(async (req, res) => {
  const record = await Record.findById(req.params.id)
    .populate('assignedTo', 'name employeeId')
    .populate('comments.addedBy', 'name employeeId');
  if (!record) throw new AppError('Record not found.', 404);
  res.status(200).json({ success: true, record });
});

// PUT /api/records/:id (admin) - edit core fields
const updateRecord = asyncHandler(async (req, res) => {
  const { customerName, phone, email, company, city, product } = req.body;

  const record = await Record.findById(req.params.id);
  if (!record) throw new AppError('Record not found.', 404);

  if (customerName !== undefined) record.customerName = customerName;
  if (phone !== undefined) record.phone = phone;
  if (email !== undefined) record.email = email;
  if (company !== undefined) record.company = company;
  if (city !== undefined) record.city = city;
  if (product !== undefined) record.product = product;

  await record.save();

  res.status(200).json({ success: true, message: 'Record updated successfully.', record });
});

// DELETE /api/records/:id (admin)
const deleteRecord = asyncHandler(async (req, res) => {
  const record = await Record.findByIdAndDelete(req.params.id);
  if (!record) throw new AppError('Record not found.', 404);
  res.status(200).json({ success: true, message: 'Record deleted successfully.' });
});

// POST /api/records/manual (admin)
// Lets the admin add one raw record by hand and assign it to an employee in
// one step, from the Assignments tab. Every manual record is grouped under a
// single shared "file" (an Import doc with source: 'manual') so it appears
// automatically in the admin Records tab and the employee's My Records tab —
// both already list by Import, so no other page needs to change.
const createManualRecord = asyncHandler(async (req, res) => {
  const { customerName, phone, email, company, city, product, employeeId } = req.body;

  const employee = await User.findOne({ _id: employeeId, role: 'employee' });
  if (!employee) throw new AppError('Employee not found.', 404);
  if (employee.status !== 'active') {
    throw new AppError('Cannot assign a record to a deactivated employee.', 400);
  }

  let importDoc = await Import.findOne({ source: 'manual' });
  if (!importDoc) {
    importDoc = await Import.create({
      fileName: MANUAL_ENTRY_FILE_NAME,
      uploadedBy: req.user._id,
      source: 'manual',
      totalRows: 0,
      importedCount: 0,
    });
  }

  const record = await Record.create({
    customerName,
    phone,
    email: email || '',
    company: company || '',
    city: city || '',
    product: product || '',
    assignedTo: employee._id,
    importBatch: importDoc._id,
  });

  importDoc.totalRows += 1;
  importDoc.importedCount += 1;
  await importDoc.save();

  await Assignment.create({
    record: record._id,
    assignedTo: employee._id,
    assignedBy: req.user._id,
    previousAssignedTo: null,
  });

  await logActivity({
    record: record._id,
    employee: req.user._id,
    action: 'assignment',
    oldValue: null,
    newValue: employee._id,
  });

  res.status(201).json({
    success: true,
    message: `Record added and assigned to ${employee.name}.`,
    record,
  });
});

module.exports = { listRecords, getRecord, updateRecord, deleteRecord, createManualRecord };