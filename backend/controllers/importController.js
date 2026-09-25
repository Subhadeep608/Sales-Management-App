const XLSX = require('xlsx');
const Import = require('../models/Import');
const Record = require('../models/Record');
const Activity = require('../models/Activity');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, buildPaginationResult } = require('../utils/paginate');

const APP_FIELDS = ['customerName', 'phone', 'email', 'company', 'city', 'product'];
const REQUIRED_FIELDS = ['customerName', 'phone'];

const guessMapping = (headers) => {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const guesses = {};
  const dictionary = {
    customerName: ['customername', 'clientname', 'name', 'fullname'],
    phone: ['phone', 'mobile', 'contact', 'phonenumber', 'mobilenumber'],
    email: ['email', 'emailaddress', 'mail'],
    company: ['company', 'companyname', 'organization'],
    city: ['city', 'location', 'place'],
    product: ['product', 'interestedproduct', 'productinterest'],
  };

  headers.forEach((header) => {
    const normalized = normalize(header);
    Object.entries(dictionary).forEach(([field, candidates]) => {
      if (!guesses[field] && candidates.includes(normalized)) {
        guesses[field] = header;
      }
    });
  });

  return guesses;
};

// POST /api/imports/preview (admin)
const previewExcel = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Please upload an Excel file.', 400);

  let workbook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  } catch (err) {
    throw new AppError('Invalid Excel format. The file could not be read.', 400);
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new AppError('The Excel file has no sheets.', 400);

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length === 0) throw new AppError('The Excel file has no data rows.', 400);

  const headers = Object.keys(rows[0]);

  res.status(200).json({
    success: true,
    fileName: req.file.originalname,
    headers,
    appFields: APP_FIELDS,
    requiredFields: REQUIRED_FIELDS,
    suggestedMapping: guessMapping(headers),
    totalRows: rows.length,
    sampleRows: rows.slice(0, 10),
    rows,
  });
});

// POST /api/imports/confirm (admin)
const confirmImport = asyncHandler(async (req, res) => {
  const { fileName, columnMapping, rows } = req.body;

  if (!columnMapping || typeof columnMapping !== 'object') {
    throw new AppError('Column mapping is required.', 400);
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError('No rows to import.', 400);
  }

  const missingRequired = REQUIRED_FIELDS.filter((f) => !columnMapping[f]);
  if (missingRequired.length > 0) {
    throw new AppError(`Required column missing for: ${missingRequired.join(', ')}.`, 400);
  }

  const importDoc = await Import.create({
    fileName: fileName || 'import.xlsx',
    uploadedBy: req.user._id,
    columnMapping,
    totalRows: rows.length,
  });

  const errors = [];
  const toInsert = [];

  rows.forEach((row, index) => {
    const mapped = {};
    APP_FIELDS.forEach((field) => {
      const sourceColumn = columnMapping[field];
      mapped[field] = sourceColumn ? String(row[sourceColumn] ?? '').trim() : '';
    });

    const missing = REQUIRED_FIELDS.filter((f) => !mapped[f]);
    if (missing.length > 0) {
      errors.push({ row: index + 2, message: `Missing required value: ${missing.join(', ')}` });
      return;
    }

    toInsert.push({ ...mapped, importBatch: importDoc._id });
  });

  let insertedCount = 0;
  if (toInsert.length > 0) {
    try {
      const inserted = await Record.insertMany(toInsert, { ordered: false });
      insertedCount = inserted.length;
    } catch (err) {
      insertedCount = err.insertedDocs ? err.insertedDocs.length : 0;
      if (err.writeErrors) {
        err.writeErrors.forEach((we) => {
          errors.push({ row: we.index + 2, message: 'Could not save this row.' });
        });
      }
    }
  }

  importDoc.importedCount = insertedCount;
  importDoc.failedCount = rows.length - insertedCount;
  importDoc.errors = errors;
  await importDoc.save();

  res.status(201).json({
    success: true,
    message: `Import complete. ${insertedCount} of ${rows.length} rows imported.`,
    import: importDoc,
  });
});

// GET /api/imports (admin)
// Each returned import now also carries `assignedToSummary` so the UI can show
// "who is this file currently assigned to" without extra per-file requests.
const listImports = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const [imports, total] = await Promise.all([
    Import.find().populate('uploadedBy', 'name employeeId').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Import.countDocuments(),
  ]);

  const importIds = imports.map((imp) => imp._id);

  const pairs = await Record.aggregate([
    { $match: { importBatch: { $in: importIds } } },
    { $group: { _id: { importBatch: '$importBatch', assignedTo: '$assignedTo' } } },
  ]);

  const assigneesByImport = new Map();
  pairs.forEach((p) => {
    const key = String(p._id.importBatch);
    if (!assigneesByImport.has(key)) assigneesByImport.set(key, new Set());
    if (p._id.assignedTo) assigneesByImport.get(key).add(String(p._id.assignedTo));
  });

  const allEmployeeIds = [...new Set([...assigneesByImport.values()].flatMap((s) => [...s]))];
  const employees = await User.find({ _id: { $in: allEmployeeIds } }).select('name employeeId');
  const employeeMap = new Map(employees.map((e) => [String(e._id), e]));

  const importsWithSummary = imports.map((imp) => {
    const key = String(imp._id);
    const assigneeIds = [...(assigneesByImport.get(key) || [])];

    let assignedToSummary = { type: 'unassigned', label: 'Unassigned' };
    if (assigneeIds.length === 1) {
      const emp = employeeMap.get(assigneeIds[0]);
      assignedToSummary = {
        type: 'single',
        label: emp ? `${emp.name} (${emp.employeeId})` : 'Unknown employee',
        employeeId: assigneeIds[0],
      };
    } else if (assigneeIds.length > 1) {
      assignedToSummary = { type: 'multiple', label: 'Multiple Employees' };
    }

    return { ...imp.toObject(), assignedToSummary };
  });

  res.status(200).json({ success: true, ...buildPaginationResult(importsWithSummary, total, page, limit) });
});

// GET /api/imports/:id (admin)
const getImport = asyncHandler(async (req, res) => {
  const importDoc = await Import.findById(req.params.id).populate('uploadedBy', 'name employeeId');
  if (!importDoc) throw new AppError('Import record not found.', 404);

  const distinctAssignees = await Record.distinct('assignedTo', { importBatch: importDoc._id });
  const nonNull = distinctAssignees.filter(Boolean);

  let assignedToSummary = { type: 'unassigned', label: 'Unassigned' };

  if (nonNull.length === 1) {
    const employee = await User.findById(nonNull[0]).select('name employeeId');
    assignedToSummary = {
      type: 'single',
      label: employee ? `${employee.name} (${employee.employeeId})` : 'Unknown employee',
      employeeId: nonNull[0],
    };
  } else if (nonNull.length > 1) {
    assignedToSummary = { type: 'multiple', label: 'Multiple Employees' };
  }

  res.status(200).json({ success: true, import: importDoc, assignedToSummary });
});

// PUT /api/imports/:id (admin) - rename the imported file's display name
const updateImport = asyncHandler(async (req, res) => {
  const { fileName } = req.body;

  const importDoc = await Import.findById(req.params.id);
  if (!importDoc) throw new AppError('Import record not found.', 404);

  if (fileName !== undefined) importDoc.fileName = fileName;
  await importDoc.save();

  res.status(200).json({ success: true, message: 'File renamed successfully.', import: importDoc });
});

// DELETE /api/imports/:id (admin)
const deleteImportBatch = asyncHandler(async (req, res) => {
  const importDoc = await Import.findById(req.params.id);
  if (!importDoc) throw new AppError('Import record not found.', 404);

  const records = await Record.find({ importBatch: importDoc._id }).select('_id');
  const recordIds = records.map((r) => r._id);

  if (recordIds.length > 0) {
    await Promise.all([
      Record.deleteMany({ _id: { $in: recordIds } }),
      Activity.deleteMany({ record: { $in: recordIds } }),
      Assignment.deleteMany({ record: { $in: recordIds } }),
    ]);
  }

  await importDoc.deleteOne();

  res.status(200).json({
    success: true,
    message: `File deleted along with ${recordIds.length} record(s).`,
  });
});

module.exports = { previewExcel, confirmImport, listImports, getImport, updateImport, deleteImportBatch };