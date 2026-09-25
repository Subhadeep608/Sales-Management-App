const mongoose = require('mongoose');

const importSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    columnMapping: { type: mongoose.Schema.Types.Mixed, default: {} },
    totalRows: { type: Number, default: 0 },
    importedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    errors: [{ row: Number, message: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Import', importSchema);
