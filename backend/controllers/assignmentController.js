const Record = require('../models/Record');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const logActivity = require('../utils/activityLogger');
const { getPagination, buildPaginationResult } = require('../utils/paginate');

// POST /api/assignments (admin)
const assignRecords = asyncHandler(async (req, res) => {
  const { recordIds, employeeId } = req.body;

  if (!Array.isArray(recordIds) || recordIds.length === 0) {
    throw new AppError('At least one record must be selected.', 400);
  }
  if (!employeeId) throw new AppError('An employee must be selected.', 400);

  const employee = await User.findOne({ _id: employeeId, role: 'employee' });
  if (!employee) throw new AppError('Employee not found.', 404);
  if (employee.status !== 'active') {
    throw new AppError('Cannot assign records to a deactivated employee.', 400);
  }

  const records = await Record.find({ _id: { $in: recordIds } });
  if (records.length === 0) throw new AppError('No matching records found.', 404);

  const assignmentDocs = [];
  const activityDocs = [];

  for (const record of records) {
    const previousAssignedTo = record.assignedTo;
    record.assignedTo = employee._id;
    await record.save();

    assignmentDocs.push({
      record: record._id,
      assignedTo: employee._id,
      assignedBy: req.user._id,
      previousAssignedTo,
    });

    activityDocs.push({
      record: record._id,
      employee: req.user._id,
      action: 'assignment',
      oldValue: previousAssignedTo,
      newValue: employee._id,
    });
  }

  await Assignment.insertMany(assignmentDocs);
  await Promise.all(activityDocs.map((a) => logActivity(a)));

  res.status(200).json({
    success: true,
    message: `${records.length} record(s) assigned to ${employee.name}.`,
    assignedCount: records.length,
  });
});

// POST /api/assignments/bulk-by-filter (admin)
// Body: { filter: { status, city, product, unassigned, importBatch }, employeeId }
// filter.importBatch assigns every record from one imported Excel file to one employee —
// used both for the first assignment and for reassigning (editing) that file's owner.
const assignByFilter = asyncHandler(async (req, res) => {
  const { filter = {}, employeeId } = req.body;

  if (!employeeId) throw new AppError('An employee must be selected.', 400);

  const employee = await User.findOne({ _id: employeeId, role: 'employee' });
  if (!employee) throw new AppError('Employee not found.', 404);

  const query = {};
  if (filter.status) query.status = filter.status;
  if (filter.city) query.city = { $regex: filter.city, $options: 'i' };
  if (filter.product) query.product = { $regex: filter.product, $options: 'i' };
  if (filter.unassigned) query.assignedTo = null;
  if (filter.importBatch) query.importBatch = filter.importBatch;

  const records = await Record.find(query);
  if (records.length === 0) {
    return res.status(200).json({ success: true, message: 'No records matched the filter.', assignedCount: 0 });
  }

  const assignmentDocs = [];
  const activityDocs = [];

  for (const record of records) {
    const previousAssignedTo = record.assignedTo;
    record.assignedTo = employee._id;
    await record.save();

    assignmentDocs.push({
      record: record._id,
      assignedTo: employee._id,
      assignedBy: req.user._id,
      previousAssignedTo,
    });
    activityDocs.push({
      record: record._id,
      employee: req.user._id,
      action: 'assignment',
      oldValue: previousAssignedTo,
      newValue: employee._id,
    });
  }

  await Assignment.insertMany(assignmentDocs);
  await Promise.all(activityDocs.map((a) => logActivity(a)));

  res.status(200).json({
    success: true,
    message: `${records.length} record(s) assigned to ${employee.name}.`,
    assignedCount: records.length,
  });
});

// GET /api/assignments (admin)
const listAssignmentHistory = asyncHandler(async (req, res) => {
  const { recordId, employeeId } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const filter = {};
  if (recordId) filter.record = recordId;
  if (employeeId) filter.assignedTo = employeeId;

  const [history, total] = await Promise.all([
    Assignment.find(filter)
      .populate('record', 'customerName phone')
      .populate('assignedTo', 'name employeeId')
      .populate('assignedBy', 'name employeeId')
      .populate('previousAssignedTo', 'name employeeId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Assignment.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, ...buildPaginationResult(history, total, page, limit) });
});

module.exports = { assignRecords, assignByFilter, listAssignmentHistory };