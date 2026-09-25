const Activity = require('../models/Activity');

// Fire-and-forget style logger used by controllers after a mutation succeeds.
const logActivity = async ({ record, employee, action, oldValue = null, newValue = null }) => {
  try {
    await Activity.create({ record, employee, action, oldValue, newValue });
  } catch (err) {
    // Activity logging must never break the main request.
    console.error('Failed to log activity:', err.message);
  }
};

module.exports = logActivity;
