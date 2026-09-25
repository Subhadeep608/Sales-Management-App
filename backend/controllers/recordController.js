const Record = require('../models/Record');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, buildPaginationResult } = require('../utils/paginate');

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

module.exports = { listRecords, getRecord, updateRecord, deleteRecord };