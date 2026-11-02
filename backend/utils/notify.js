const Notification = require('../models/Notification');

// Tells an employee that a record has been assigned to them. A failure here is
// logged but never blocks the assignment itself.
const notifyRecordAssigned = async ({ userId, record }) => {
  try {
    await Notification.create({
      user: userId,
      type: 'record_assigned',
      message: 'You have got a new data-record.',
      record: record._id,
      recordName: record.customerName,
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

module.exports = { notifyRecordAssigned };