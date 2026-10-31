const User = require('../models/User');
const Record = require('../models/Record');
const Import = require('../models/Import');
const Activity = require('../models/Activity');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const STATUS_LIST = ['pending', 'not_connected', 'follow_up', 'interested', 'not_interested', 'joined'];
const WORK_ACTIONS = ['status_change', 'comment_added', 'follow_up_set'];
// 'converted' was this status's old name. Records renamed by the one-time
// migration still carry it in their history, so both names are matched.
const JOIN_VALUES = ['joined', 'converted'];

const emptyBreakdown = () =>
  STATUS_LIST.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

// Returns the [start, end) range for a YYYY-MM-DD date (defaults to today).
// Uses the same UTC day boundaries as the Reports tab and the employee dashboard.
const getDayRange = (dateInput) => {
  const dateStr = dateInput || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new AppError('Invalid date format.', 400);
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) throw new AppError('Invalid date.', 400);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { dateStr, start, end };
};

// GET /api/dashboard/admin?date=YYYY-MM-DD
//  - date (optional, defaults to today): the day used for dailyWork.
//  - statusBreakdown always covers every record in the system.
//  - joinings lists everyone currently marked Joined, newest first.
const adminDashboard = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const { dateStr, start, end } = getDayRange(date);

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

  // Status breakdown across all records.
  const statusCounts = await Record.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const statusBreakdown = emptyBreakdown();
  statusCounts.forEach((s) => {
    statusBreakdown[s._id] = s.count;
  });

  // Daily work across ALL employees. A record counts for the day if an employee
  // changed its status, added a comment, or set a follow-up date that day. The
  // status counted is the one it ended the day on (the last status change made
  // that day, otherwise its current status). Each record is counted once.
  const activities = await Activity.find({
    createdAt: { $gte: start, $lt: end },
    action: { $in: WORK_ACTIONS },
  })
    .sort({ createdAt: 1 })
    .lean();

  const workedMap = new Map();
  activities.forEach((a) => {
    const key = String(a.record);
    const existing = workedMap.get(key) || { lastStatusValue: null };
    if (a.action === 'status_change') existing.lastStatusValue = a.newValue;
    workedMap.set(key, existing);
  });

  const workedRecords = await Record.find({ _id: { $in: [...workedMap.keys()] } })
    .select('status')
    .lean();
  const workedRecordMap = new Map(workedRecords.map((r) => [String(r._id), r]));

  const workedBreakdown = emptyBreakdown();
  let totalWorked = 0;
  workedMap.forEach((w, recordId) => {
    const record = workedRecordMap.get(recordId);
    if (!record) return; // record was deleted since
    const resolvedStatus =
      w.lastStatusValue && STATUS_LIST.includes(w.lastStatusValue) ? w.lastStatusValue : record.status;
    totalWorked += 1;
    if (STATUS_LIST.includes(resolvedStatus)) workedBreakdown[resolvedStatus] += 1;
  });

  // "My Joining": everyone currently marked Joined. The date and the employee
  // come from the latest status change that set them to Joined. If a record has
  // no such history at all, fall back to its last-updated time and its assigned
  // employee.
  const joinedRecords = await Record.find({ status: 'joined' })
    .select('customerName assignedTo updatedAt')
    .lean();

  let joinings = [];
  if (joinedRecords.length > 0) {
    const joinActivities = await Activity.find({
      record: { $in: joinedRecords.map((r) => r._id) },
      action: 'status_change',
      newValue: { $in: JOIN_VALUES },
    })
      .sort({ createdAt: 1 })
      .lean();

    const latestJoinByRecord = new Map();
    joinActivities.forEach((a) => latestJoinByRecord.set(String(a.record), a)); // ascending, so the last one wins

    const employeeIds = new Set();
    joinedRecords.forEach((r) => {
      const act = latestJoinByRecord.get(String(r._id));
      const empId = act ? act.employee : r.assignedTo;
      if (empId) employeeIds.add(String(empId));
    });

    const employeeDocs = await User.find({ _id: { $in: [...employeeIds] } })
      .select('name employeeId')
      .lean();
    const employeeLookup = new Map(employeeDocs.map((e) => [String(e._id), e]));

    joinings = joinedRecords
      .map((r) => {
        const act = latestJoinByRecord.get(String(r._id));
        const empId = act ? act.employee : r.assignedTo;
        const emp = empId ? employeeLookup.get(String(empId)) : null;
        return {
          recordId: String(r._id),
          customerName: r.customerName,
          joinedAt: act ? act.createdAt : r.updatedAt,
          employeeName: emp ? emp.name : 'Unassigned',
          employeeCode: emp ? emp.employeeId : null,
        };
      })
      .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));
  }

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
    dailyWork: { date: dateStr, totalWorked, breakdown: workedBreakdown },
    joinings,
    employeeLastLogins,
  });
});

// GET /api/dashboard/employee
//  - statusBreakdown covers every record assigned to this employee.
//  - joinings lists the people THIS employee marked as Joined, newest first.
//    A record counts as joined by this employee when the latest event that set
//    it to Joined was made by them. If a record has no such history at all, it
//    falls back to the employee it is currently assigned to.
const employeeDashboard = asyncHandler(async (req, res) => {
  const me = req.user._id;

  const [statusCounts, totalAssigned] = await Promise.all([
    Record.aggregate([{ $match: { assignedTo: me } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Record.countDocuments({ assignedTo: me }),
  ]);

  const statusBreakdown = emptyBreakdown();
  statusCounts.forEach((s) => {
    statusBreakdown[s._id] = s.count;
  });

  // Records this employee has ever set to Joined.
  const myJoinActivities = await Activity.find({
    employee: me,
    action: 'status_change',
    newValue: { $in: JOIN_VALUES },
  })
    .select('record')
    .lean();
  const recordIdsJoinedByMe = [...new Set(myJoinActivities.map((a) => String(a.record)))];

  // Candidates: currently Joined, and either joined by me at some point or
  // currently assigned to me.
  const candidates = await Record.find({
    status: 'joined',
    $or: [{ _id: { $in: recordIdsJoinedByMe } }, { assignedTo: me }],
  })
    .select('customerName assignedTo updatedAt')
    .lean();

  let joinings = [];
  if (candidates.length > 0) {
    const joinActivities = await Activity.find({
      record: { $in: candidates.map((r) => r._id) },
      action: 'status_change',
      newValue: { $in: JOIN_VALUES },
    })
      .sort({ createdAt: 1 })
      .lean();

    const latestJoinByRecord = new Map();
    joinActivities.forEach((a) => latestJoinByRecord.set(String(a.record), a)); // ascending, so the last one wins

    joinings = candidates
      .map((r) => {
        const act = latestJoinByRecord.get(String(r._id));
        const joinedByMe = act ? String(act.employee) === String(me) : String(r.assignedTo) === String(me);
        if (!joinedByMe) return null;
        return {
          recordId: String(r._id),
          customerName: r.customerName,
          joinedAt: act ? act.createdAt : r.updatedAt,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));
  }

  res.status(200).json({
    success: true,
    stats: { totalAssigned, statusBreakdown },
    joinings,
  });
});

module.exports = { adminDashboard, employeeDashboard };