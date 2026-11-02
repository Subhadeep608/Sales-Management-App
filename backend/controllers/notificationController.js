const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/notifications
// Returns the 30 newest notifications for the logged-in employee, plus the
// total unread count. `available` is false when the record has since been
// reassigned to someone else or deleted, so the app can grey the item out
// instead of sending the employee to a "not found" page.
const listMine = asyncHandler(async (req, res) => {
  const [rows, unreadCount] = await Promise.all([
    Notification.find({ user: req.user._id })
      .populate('record', 'customerName phone assignedTo')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);

  const notifications = rows.map((n) => ({
    _id: String(n._id),
    message: n.message,
    recordName: n.record?.customerName || n.recordName || '',
    recordPhone: n.record?.phone || '',
    recordId: n.record ? String(n.record._id) : null,
    read: n.read,
    createdAt: n.createdAt,
    available: !!n.record && String(n.record.assignedTo) === String(req.user._id),
  }));

  res.status(200).json({ success: true, unreadCount, notifications });
});

// PUT /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  if (result.matchedCount === 0) throw new AppError('Notification not found.', 404);
  res.status(200).json({ success: true });
});

// PUT /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.status(200).json({ success: true });
});

module.exports = { listMine, markRead, markAllRead };