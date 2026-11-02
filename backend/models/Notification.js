const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        // The employee who receives the notification.
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        type: { type: String, enum: ['record_assigned'], default: 'record_assigned' },
        message: { type: String, required: true, maxlength: 300 },
        record: { type: mongoose.Schema.Types.ObjectId, ref: 'Record', default: null },
        // Saved when the notification is created, so the name can still be shown if
        // the record is deleted later.
        recordName: { type: String, default: '', maxlength: 150 },
        read: { type: Boolean, default: false },
    },
    { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
// Notifications delete themselves after 30 days so the collection can't grow forever.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('Notification', notificationSchema);