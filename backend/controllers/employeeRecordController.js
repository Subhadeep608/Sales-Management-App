const Record = require('../models/Record');
const { STATUSES } = require('../models/Record');
const Import = require('../models/Import');
const Activity = require('../models/Activity');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const logActivity = require('../utils/activityLogger');
const { getPagination, buildPaginationResult } = require('../utils/paginate');

const WORK_ACTIONS = ['status_change', 'comment_added', 'follow_up_set'];

// GET /api/employee/records/report?date=&status=&search=&page=&limit=
// Flat, filterable list of every record assigned to this employee — same shape
// as the admin Reports table, minus the User column (it's always this employee).
// Date/Time shown = the latest status/comment/follow-up change this employee
// made that date, or the record's import/creation time if untouched.
const myReport = asyncHandler(async (req, res) => {
  const { date, status, search } = req.query;
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

  const activityMatch = { employee: req.user._id, action: { $in: WORK_ACTIONS } };
  if (start) activityMatch.createdAt = { $gte: start, $lt: end };

  const activities = await Activity.find(activityMatch).sort({ createdAt: 1 }).lean();

  const recordEventMap = new Map();
  activities.forEach((a) => {
    const key = String(a.record);
    const existing = recordEventMap.get(key) || { lastStatusValue: null, timestamp: null };
    existing.timestamp = a.createdAt;
    if (a.action === 'status_change') existing.lastStatusValue = a.newValue;
    recordEventMap.set(key, existing);
  });

  const recordCreateMatch = { assignedTo: req.user._id };
  if (start) recordCreateMatch.createdAt = { $gte: start, $lt: end };

  const recordsInRange = await Record.find(recordCreateMatch)
    .select('customerName phone email status leadSource importBatch createdAt')
    .lean();

  const allRecordIds = new Set([...recordEventMap.keys(), ...recordsInRange.map((r) => String(r._id))]);

  // Re-fetch restricted to records CURRENTLY assigned to this employee, so a
  // record reassigned away after being worked on no longer shows up for them.
  const allRecords = await Record.find({ _id: { $in: [...allRecordIds] }, assignedTo: req.user._id })
    .select('customerName phone email status leadSource importBatch createdAt')
    .lean();
  const allRecordMap = new Map(allRecords.map((r) => [String(r._id), r]));

  const importIdsNeeded = new Set();
  const rows = [];
  allRecordIds.forEach((recordId) => {
    const record = allRecordMap.get(recordId);
    if (!record) return;

    const event = recordEventMap.get(recordId);
    let recordStatus;
    let timestamp;

    if (event) {
      recordStatus = event.lastStatusValue && STATUSES.includes(event.lastStatusValue) ? event.lastStatusValue : record.status;
      timestamp = event.timestamp;
    } else {
      recordStatus = record.status;
      timestamp = record.createdAt;
    }

    if (record.importBatch) importIdsNeeded.add(String(record.importBatch));

    rows.push({
      recordId,
      customerName: record.customerName,
      phone: record.phone,
      email: record.email || '',
      status: recordStatus,
      timestamp,
      leadSource: record.leadSource || '',
      importId: record.importBatch ? String(record.importBatch) : null,
    });
  });

  const importDocs = await Import.find({ _id: { $in: [...importIdsNeeded] } }).select('fileName leadSource').lean();
  const importLookup = new Map(importDocs.map((i) => [String(i._id), i]));

  let allRows = rows.map((r) => {
    const imp = r.importId ? importLookup.get(r.importId) : null;
    return {
      recordId: r.recordId,
      customerName: r.customerName,
      phone: r.phone,
      email: r.email,
      status: r.status,
      timestamp: r.timestamp,
      leadSource: r.leadSource || (imp ? imp.leadSource : '') || '-',
    };
  });

  if (status && STATUSES.includes(status)) {
    allRows = allRows.filter((r) => r.status === status);
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

  allRows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const total = allRows.length;
  const pageRows = allRows.slice(skip, skip + limit);

  res.status(200).json({ success: true, date: date || null, ...buildPaginationResult(pageRows, total, page, limit) });
});

// GET /api/employee/records
const myRecords = asyncHandler(async (req, res) => {
  const { search, status, importBatch } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const filter = { assignedTo: req.user._id };
  if (importBatch) filter.importBatch = importBatch;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { customerName: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [records, total] = await Promise.all([
    Record.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Record.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, ...buildPaginationResult(records, total, page, limit) });
});

// GET /api/employee/records/files
const myAssignedFiles = asyncHandler(async (req, res) => {
  const counts = await Record.aggregate([
    { $match: { assignedTo: req.user._id, importBatch: { $ne: null } } },
    { $group: { _id: '$importBatch', totalAssigned: { $sum: 1 } } },
  ]);

  const importIds = counts.map((c) => c._id);
  const imports = await Import.find({ _id: { $in: importIds } })
    .select('fileName createdAt')
    .sort({ createdAt: -1 });

  const countMap = new Map(counts.map((c) => [String(c._id), c.totalAssigned]));

  const files = imports.map((imp) => ({
    _id: imp._id,
    fileName: imp.fileName,
    totalAssigned: countMap.get(String(imp._id)) || 0,
  }));

  res.status(200).json({ success: true, files });
});

const loadOwnRecordOrFail = async (recordId, userId) => {
  const record = await Record.findOne({ _id: recordId, assignedTo: userId }).populate(
    'comments.addedBy',
    'name employeeId'
  );
  if (!record) throw new AppError('Record not found.', 404);
  return record;
};

// GET /api/employee/records/:id
const getMyRecord = asyncHandler(async (req, res) => {
  const record = await loadOwnRecordOrFail(req.params.id, req.user._id);
  res.status(200).json({ success: true, record });
});

// PUT /api/employee/records/:id
const updateMyRecord = asyncHandler(async (req, res) => {
  const { status, comment, followUpDate, customerName, phone, email } = req.body;
  const record = await loadOwnRecordOrFail(req.params.id, req.user._id);
  if (customerName !== undefined) record.customerName = customerName;
  if (phone !== undefined) record.phone = phone;
  if (email !== undefined) record.email = email;

  if (status !== undefined && status !== record.status) {
    if (!STATUSES.includes(status)) throw new AppError('Invalid status.', 400);
    const oldStatus = record.status;
    record.status = status;
    await logActivity({
      record: record._id,
      employee: req.user._id,
      action: 'status_change',
      oldValue: oldStatus,
      newValue: status,
    });
  }

  if (comment !== undefined && comment.trim() !== '') {
    record.comments.push({ text: comment.trim(), addedBy: req.user._id });
    await logActivity({
      record: record._id,
      employee: req.user._id,
      action: 'comment_added',
      oldValue: null,
      newValue: comment.trim(),
    });
  }

  if (followUpDate !== undefined) {
    const oldDate = record.followUpDate;
    record.followUpDate = followUpDate ? new Date(followUpDate) : null;
    await logActivity({
      record: record._id,
      employee: req.user._id,
      action: 'follow_up_set',
      oldValue: oldDate,
      newValue: record.followUpDate,
    });
  }

  await record.save();

  const updated = await loadOwnRecordOrFail(req.params.id, req.user._id);
  res.status(200).json({ success: true, message: 'Record updated successfully.', record: updated });
});

// GET /api/employee/records/daily-summary?date=YYYY-MM-DD (defaults to today)
const dailyWorkSummary = asyncHandler(async (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new AppError('Invalid date format.', 400);

  const start = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) throw new AppError('Invalid date.', 400);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const activities = await Activity.find({
    employee: req.user._id,
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

  const recordIds = [...workedMap.keys()];
  const records = await Record.find({ _id: { $in: recordIds } }).select('status').lean();
  const recordMap = new Map(records.map((r) => [String(r._id), r]));

  const breakdown = STATUSES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
  let totalWorked = 0;

  workedMap.forEach((w, recordId) => {
    const record = recordMap.get(recordId);
    if (!record) return;
    const resolvedStatus = w.lastStatusValue && STATUSES.includes(w.lastStatusValue) ? w.lastStatusValue : record.status;
    totalWorked += 1;
    if (STATUSES.includes(resolvedStatus)) breakdown[resolvedStatus] += 1;
  });

  res.status(200).json({ success: true, date: dateStr, totalWorked, breakdown });
});

module.exports = { myRecords, getMyRecord, updateMyRecord, myAssignedFiles, dailyWorkSummary, myReport };