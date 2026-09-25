const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = Object.freeze({ ADMIN: 'admin', EMPLOYEE: 'employee' });
const STATUSES = Object.freeze({ ACTIVE: 'active', INACTIVE: 'inactive' });

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required.'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9_-]{3,20}$/, 'Employee ID must be 3-20 characters (letters, numbers, - or _).'],
    },
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters.'],
      maxlength: [100, 'Name cannot exceed 100 characters.'],
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address.'],
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      select: false,
    },
    role: {
      type: String,
      enum: { values: Object.values(ROLES), message: 'Invalid role.' },
      default: ROLES.EMPLOYEE,
    },
    status: {
      type: String,
      enum: { values: Object.values(STATUSES), message: 'Invalid status.' },
      default: STATUSES.ACTIVE,
    },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
module.exports.STATUSES = STATUSES;
