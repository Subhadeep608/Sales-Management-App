const mongoose = require('mongoose');

// One document per assignment event -> full assignment history.
const assignmentSchema = new mongoose.Schema(
  {
    record: { type: mongoose.Schema.Types.ObjectId, ref: 'Record', required: true, index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    previousAssignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assignment', assignmentSchema);
