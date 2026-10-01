const User = require('../models/User');
const Record = require('../models/Record');
const Activity = require('../models/Activity');
const Import = require('../models/Import');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, buildPaginationResult } = require('../utils/paginate');

const STATUS_LIST = ['pending', 'contacted', 'interested', 'follow_up', 'not_interested', 'converted'];
const WORK_ACTIONS = ['status_change', 'comment_added', 'follow_up_set'];

// GET /api/reports/daily?date=&status=&search=&employeeId=&page=&limit= (admin)
const dailyReport = asyncHandler(async (req, res) => {
  const { date, status, search, employeeId } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  let start = null;
  let end = null;
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError('Invalid date format.', 400);
    start = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) throw new AppError('Invalid date.', 400);
    end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
  }

  const activityMatch = { action: { $in: WORK_ACTIONS } };
  if (start) activityMatch.createdAt = { $gte: start, $lt: end };

  const activities = await Activity.find(activityMatch).sort({ createdAt: 1 }).lean();

  const recordEventMap = new Map();
  activities.forEach((a) => {
    const key = String(a.record);
    const existing = recordEventMap.get(key) || { employee: null, lastStatusValue: null, timestamp: null };
    existing.employee = a.employee;
    existing.timestamp = a.createdAt;
    if (a.action === 'status_change') existing.lastStatusValue = a.newValue;
    recordEventMap.set(key, existing);
  });

  const recordCreateMatch = {};
  if (start) recordCreateMatch.createdAt = { $gte: start, $lt: end };

  const recordsInRange = await Record.find(recordCreateMatch)
    .select('customerName phone email status assignedTo importBatch createdAt')
    .lean();

  const allRecordIds = new Set([...recordEventMap.keys(), ...recordsInRange.map((r) => String(r._id))]);

  const allRecords = await Record.find({ _id: { $in: [...allRecordIds] } })
    .select('customerName phone email status assignedTo importBatch createdAt')
    .lean();
  const allRecordMap = new Map(allRecords.map((r) => [String(r._id), r]));

  const employeeIdsNeeded = new Set();
  const importIdsNeeded = new Set();

  const rows = [];
  allRecordIds.forEach((recordId) => {
    const record = allRecordMap.get(recordId);
    if (!record) return;

    const event = recordEventMap.get(recordId);
    let employeeObjId;
    let recordStatus;
    let timestamp;

    if (event) {
      employeeObjId = event.employee;
      recordStatus = event.lastStatusValue && STATUS_LIST.includes(event.lastStatusValue) ? event.lastStatusValue : record.status;
      timestamp = event.timestamp;
    } else {
      employeeObjId = record.assignedTo;
      recordStatus = record.status;
      timestamp = record.createdAt;
    }

    if (employeeObjId) employeeIdsNeeded.add(String(employeeObjId));
    if (record.importBatch) importIdsNeeded.add(String(record.importBatch));

    rows.push({
      recordId,
      customerName: record.customerName,
      phone: record.phone,
      email: record.email || '',
      status: recordStatus,
      timestamp,
      employeeObjId: employeeObjId ? String(employeeObjId) : null,
      importId: record.importBatch ? String(record.importBatch) : null,
      leadSource: record.leadSource || '', // <-- add this line
    });
  });

  const [employeeDocs, importDocs] = await Promise.all([
    User.find({ _id: { $in: [...employeeIdsNeeded] } }).select('name employeeId').lean(),
    Import.find({ _id: { $in: [...importIdsNeeded] } }).select('fileName leadSource').lean(),
  ]);
  const employeeLookup = new Map(employeeDocs.map((e) => [String(e._id), e]));
  const importLookup = new Map(importDocs.map((i) => [String(i._id), i]));

  let allRows = rows.map((r) => {
    const emp = r.employeeObjId ? employeeLookup.get(r.employeeObjId) : null;
    const imp = r.importId ? importLookup.get(r.importId) : null;
    return {
      recordId: r.recordId,
      customerName: r.customerName,
      phone: r.phone,
      email: r.email,
      status: r.status,
      timestamp: r.timestamp,
      leadSource: r.leadSource || (imp ? imp.leadSource : '') || '-',
      employeeObjId: r.employeeObjId,
      employeeName: emp ? emp.name : 'Unassigned',
      employeeCode: emp ? emp.employeeId : null,
    };
  });

  if (status && STATUS_LIST.includes(status)) {
    allRows = allRows.filter((r) => r.status === status);
  }
  if (employeeId) {
    allRows = allRows.filter((r) => r.employeeObjId === employeeId);
  }
  if (search) {
    const term = search.toLowerCase();
    allRows = allRows.filter(
      (r) =>
        r.customerName.toLowerCase().includes(term) ||
        r.phone.toLowerCase().includes(term) ||
        (r.email && r.email.toLowerCase().includes(term))
    );
  }

  // Summary reflects the currently filtered set, not the whole database.
  const summary = {
    totalListed: allRows.length,
    totalInterested: allRows.filter((r) => r.status === 'interested').length,
    totalContacted: allRows.filter((r) => r.status === 'contacted').length,
    totalConverted: allRows.filter((r) => r.status === 'converted').length,
  };

  allRows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const total = allRows.length;
  const pageRows = allRows.slice(skip, skip + limit);

  res.status(200).json({
    success: true,
    date: date || null,
    summary,
    ...buildPaginationResult(pageRows, total, page, limit),
  });
});

module.exports = { dailyReport };