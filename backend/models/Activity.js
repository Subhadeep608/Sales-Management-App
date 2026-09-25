const mongoose = require('mongoose');

const ACTIONS = Object.freeze([
  'status_change',
  'comment_added',
  'assignment',
  'follow_up_set',
  'record_imported',
]);

const activitySchema = new mongoose.Schema(
  {
    record: { type: mongoose.Schema.Types.ObjectId, ref: 'Record', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ACTIONS, required: true },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
module.exports.ACTIONS = ACTIONS;
