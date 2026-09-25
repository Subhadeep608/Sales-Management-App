const User = require('../models/User');
const Record = require('../models/Record');
const Activity = require('../models/Activity');
const Import = require('../models/Import');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const STATUS_LIST = ['pending', 'contacted', 'interested', 'follow_up', 'not_interested', 'converted'];
const WORK_ACTIONS = ['status_change', 'comment_added', 'follow_up_set'];

// GET /api/reports/daily?date=YYYY-MM-DD (admin)
const dailyReport = asyncHandler(async (req, res) => {
  const { date } = req.query;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new AppError('A valid date (YYYY-MM-DD) is required.', 400);
  }

  const start = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) throw new AppError('Invalid date.', 400);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  // Every action an employee performed on a record within this date (UTC day boundaries).
  const activities = await Activity.find({
    createdAt: { $gte: start, $lt: end },
    action: { $in: WORK_ACTIONS },
  })
    .sort({ createdAt: 1 })
    .lean();

  // key = `${employeeId}_${recordId}` -> tracks the record's status as of the LAST
  // status_change made that day (ascending sort means later entries overwrite earlier ones).
  const workedMap = new Map();
  activities.forEach((a) => {
    const key = `${a.employee}_${a.record}`;
    const existing = workedMap.get(key) || { employee: a.employee, record: a.record, lastStatusValue: null };
    if (a.action === 'status_change') existing.lastStatusValue = a.newValue;
    workedMap.set(key, existing);
  });

  const workedEntries = [...workedMap.values()];
  const recordIds = [...new Set(workedEntries.map((w) => String(w.record)))];

  const records = await Record.find({ _id: { $in: recordIds } }).select('status importBatch').lean();
  const recordMap = new Map(records.map((r) => [String(r._id), r]));

  const importIds = [...new Set(records.map((r) => (r.importBatch ? String(r.importBatch) : null)).filter(Boolean))];
  const imports = await Import.find({ _id: { $in: importIds } }).select('fileName').lean();
  const importMap = new Map(imports.map((i) => [String(i._id), i]));

  const employees = await User.find({ role: 'employee' }).select('name employeeId status').sort({ name: 1 }).lean();

  // keyed by employee _id (string)
  const perEmployee = new Map();
  employees.forEach((emp) => {
    perEmployee.set(String(emp._id), {
      _id: emp._id,
      employeeId: emp.employeeId,
      name: emp.name,
      status: emp.status,
      totalRecordsWorked: 0,
      statusBreakdown: STATUS_LIST.reduce((acc, s) => ({ ...acc, [s]: 0 }), {}),
      sheetsMap: new Map(), // importId(string) -> workedToday count
    });
  });

  workedEntries.forEach((w) => {
    const empData = perEmployee.get(String(w.employee));
    if (!empData) return; // activity by a user who is no longer a role:'employee' account

    const record = recordMap.get(String(w.record));
    if (!record) return;

    const resolvedStatus = w.lastStatusValue && STATUS_LIST.includes(w.lastStatusValue) ? w.lastStatusValue : record.status;

    empData.totalRecordsWorked += 1;
    if (STATUS_LIST.includes(resolvedStatus)) empData.statusBreakdown[resolvedStatus] += 1;

    if (record.importBatch) {
      const importKey = String(record.importBatch);
      empData.sheetsMap.set(importKey, (empData.sheetsMap.get(importKey) || 0) + 1);
    }
  });

  const employeesReport = [];
  for (const empData of perEmployee.values()) {
    const sheets = [];
    for (const [importId, workedToday] of empData.sheetsMap.entries()) {
      const totalAssignedToEmployee = await Record.countDocuments({
        importBatch: importId,
        assignedTo: empData._id,
      });
      sheets.push({
        importId,
        fileName: importMap.get(importId)?.fileName || 'Unknown file',
        totalAssignedToEmployee,
        workedToday,
      });
    }

    employeesReport.push({
      employeeId: empData.employeeId,
      name: empData.name,
      status: empData.status,
      totalRecordsWorked: empData.totalRecordsWorked,
      statusBreakdown: empData.statusBreakdown,
      sheets,
    });
  }

  const summary = {
    totalEmployeesWorked: employeesReport.filter((e) => e.totalRecordsWorked > 0).length,
    totalRecordsWorked: employeesReport.reduce((sum, e) => sum + e.totalRecordsWorked, 0),
  };

  res.status(200).json({ success: true, date, summary, employees: employeesReport });
});

module.exports = { dailyReport };