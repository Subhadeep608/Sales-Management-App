const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const { PASSWORD_REGEX, PASSWORD_MESSAGE } = require('../utils/passwordPolicy');

const withDemo = process.argv.includes('--demo');

const createIfMissing = async (data) => {
  const existing = await User.findOne({
    $or: [{ employeeId: data.employeeId.toUpperCase() }, { email: data.email.toLowerCase() }],
  });
  if (existing) {
    console.log(`- ${data.employeeId} already exists (skipped).`);
    return;
  }
  await User.create(data);
  console.log(`✔ Created ${data.role}: ${data.employeeId} (${data.email})`);
};

const run = async () => {
  const { ADMIN_EMPLOYEE_ID, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!ADMIN_EMPLOYEE_ID || !ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Set ADMIN_EMPLOYEE_ID, ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env');
  }
  if (!PASSWORD_REGEX.test(ADMIN_PASSWORD)) {
    throw new Error(`ADMIN_PASSWORD is too weak. ${PASSWORD_MESSAGE}`);
  }

  await connectDB();

  await createIfMissing({
    employeeId: ADMIN_EMPLOYEE_ID,
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
  });

  if (withDemo) {
    await createIfMissing({
      employeeId: 'EMP001',
      name: 'Rahul Kumar',
      email: 'rahul@example.com',
      password: 'Employee@123',
      role: 'employee',
    });
    console.log('  (Demo employee password: Employee@123 - for testing only)');
  }
};

run()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
