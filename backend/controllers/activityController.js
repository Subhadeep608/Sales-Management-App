const Activity = require('../models/Activity');
const Record = require('../models/Record');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, buildPaginationResult } = require('../utils/paginate');

// GET /api/activities?recordId=...
// Admin can view activity for any record. Employees can only view activity
// for records assigned to them (ownership is re-checked here, not trusted from the frontend).
const listActivities = asyncHandler(async (req, res) => {
  const { recordId } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  if (!recordId) throw new AppError('recordId query parameter is required.', 400);

  const record = await Record.findById(recordId);
  if (!record) throw new AppError('Record not found.', 404);

  if (req.user.role === 'employee' && String(record.assignedTo) !== String(req.user._id)) {
    throw new AppError('Record not found.', 404);
  }

  const filter = { record: recordId };

  const [activities, total] = await Promise.all([
    Activity.find(filter)
      .populate('employee', 'name employeeId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Activity.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, ...buildPaginationResult(activities, total, page, limit) });
});

module.exports = { listActivities };
