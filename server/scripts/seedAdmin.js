import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

dotenv.config();

const run = async () => {
  const name = String(process.env.ADMIN_NAME || '').trim();
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri || name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== 'string' || password.length < 16 || password.length > 128) {
    throw new Error('Set MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL and an ADMIN_PASSWORD of 16 to 128 characters.');
  }

  await mongoose.connect(mongoUri);
  const existing = await User.findOne({ email }).select('+passwordHash');
  if (existing) {
    if (existing.role !== 'admin') {
      throw new Error('The configured admin email is already assigned to a non-admin account. No account was changed.');
    }
    console.log('The configured Admin account already exists; no account was changed.');
    return;
  }

  await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'admin',
    emailVerified: true,
    isActive: true,
    mustChangePassword: true,
  });
  console.log('Initial Admin account created. Sign in and change the bootstrap password immediately.');
};

run()
  .catch((error) => {
    console.error('Admin seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
