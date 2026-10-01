const mongoose = require('mongoose');

const STATUSES = Object.freeze([
  'pending',
  'contacted',
  'interested',
  'follow_up',
  'not_interested',
  'converted',
]);

const commentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const recordSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: [true, 'Customer name is required.'], trim: true, maxlength: 150 },
    phone: { type: String, required: [true, 'Phone is required.'], trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 150, default: '' },
    company: { type: String, trim: true, maxlength: 150, default: '' },
    city: { type: String, trim: true, maxlength: 100, default: '' },
    product: { type: String, trim: true, maxlength: 150, default: '' },
    
    leadSource: { type: String, trim: true, maxlength: 150, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    status: {
      type: String,
      enum: { values: STATUSES, message: 'Invalid status.' },
      default: 'pending',
      index: true,
    },

    comments: [commentSchema],
    followUpDate: { type: Date, default: null },

    importBatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Import', default: null },
  },
  { timestamps: true }
);

recordSchema.index({ customerName: 'text', phone: 'text', email: 'text' });

const Record = mongoose.model('Record', recordSchema);

module.exports = Record;
module.exports.STATUSES = STATUSES;
