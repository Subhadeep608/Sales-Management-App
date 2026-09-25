const mongoose = require('mongoose');
const User = require('../models/User');
const Record = require('../models/Record');
const Import = require('../models/Import');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const STATUS_LIST = ['pending', 'contacted', 'interested', 'follow_up', 'not_interested', 'converted'];

// GET /api/dashboard/admin?importBatch=<id>
const adminDashboard = asyncHandler(async (req, res) => {
  const { importBatch } = req.query;

  let importBatchId = null;
  if (importBatch) {
    if (!mongoose.Types.ObjectId.isValid(importBatch)) {
      throw new AppError('Invalid file id.', 400);
    }
    importBatchId = new mongoose.Types.ObjectId(importBatch);
  }

  const [totalEmployees, totalImportFiles, totalRecords, employeeLastLogins] = await Promise.all([
    User.countDocuments({ role: 'employee' }),
    Import.countDocuments(),
    Record.countDocuments(),
    User.find({ role: 'employee' })
      .select('name employeeId status lastLoginAt')
      .sort({ lastLoginAt: -1 })
      .limit(10),
  ]);

  // A file counts as "assigned" if ANY of its records has an owner.
  const assignedGroups = await Record.aggregate([
    { $match: { importBatch: { $ne: null } } },
    { $group: { _id: '$importBatch', anyAssigned: { $max: { $cond: [{ $ne: ['$assignedTo', null] }, 1, 0] } } } },
    { $match: { anyAssigned: 1 } },
  ]);
  const assignedFiles = assignedGroups.length;
  const unassignedFiles = Math.max(totalImportFiles - assignedFiles, 0);

  let statusBreakdown = null;
  if (importBatchId) {
    const statusCounts = await Record.aggregate([
      { $match: { importBatch: importBatchId } }, // <-- must be an ObjectId, not a string
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    statusBreakdown = STATUS_LIST.reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {});
    statusCounts.forEach((s) => {
      statusBreakdown[s._id] = s.count;
    });
  }

  const performance = await Record.aggregate([
    { $match: { assignedTo: { $ne: null } } },
    {
      $group: {
        _id: '$assignedTo',
        totalAssigned: { $sum: 1 },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
      },
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'employee' } },
    { $unwind: '$employee' },
    {
      $project: {
        _id: 0,
        employeeId: '$employee.employeeId',
        name: '$employee.name',
        totalAssigned: 1,
        converted: 1,
      },
    },
    { $sort: { totalAssigned: -1 } },
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalEmployees,
      totalImportFiles,
      totalRecords,
      assignedFiles,
      unassignedFiles,
      statusBreakdown,
    },
    performance,
    employeeLastLogins,
  });
});

// GET /api/dashboard/employee?importBatch=<id>
// importBatch is optional: when present, both totalAssigned and statusBreakdown
// are scoped to that one file (still restricted to this employee's own records).
const employeeDashboard = asyncHandler(async (req, res) => {
  const { importBatch } = req.query;

  let importBatchId = null;
  if (importBatch) {
    if (!mongoose.Types.ObjectId.isValid(importBatch)) {
      throw new AppError('Invalid file id.', 400);
    }
    importBatchId = new mongoose.Types.ObjectId(importBatch);
  }

  const match = { assignedTo: req.user._id };
  if (importBatchId) match.importBatch = importBatchId;

  const [statusCounts, totalAssigned] = await Promise.all([
    Record.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Record.countDocuments(match),
  ]);

  const statusBreakdown = STATUS_LIST.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});
  statusCounts.forEach((s) => {
    statusBreakdown[s._id] = s.count;
  });

  res.status(200).json({
    success: true,
    stats: { totalAssigned, statusBreakdown },
  });
});

module.exports = { adminDashboard, employeeDashboard };