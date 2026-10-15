import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import '../src/config.js';
import User from '../src/models/User.js';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gateway';
const accounts = [
  { role: 'admin', email: process.env.BOOTSTRAP_ADMIN_EMAIL, password: process.env.BOOTSTRAP_ADMIN_PASSWORD, name: 'GateWay Security Admin' },
  { role: 'guard', email: process.env.BOOTSTRAP_GUARD_EMAIL, password: process.env.BOOTSTRAP_GUARD_PASSWORD, name: 'GateWay Security Guard' }
];
const validAccounts = accounts.filter((account) => account.email && account.password && !account.password.startsWith('replace-with-'));
if (!validAccounts.length) {
  console.error('No bootstrap accounts configured. Set BOOTSTRAP_ADMIN_EMAIL/PASSWORD and/or BOOTSTRAP_GUARD_EMAIL/PASSWORD in server/.env.');
  process.exit(1);
}
if (validAccounts.some((account) => account.password.length < 12)) {
  console.error('Bootstrap passwords must be at least 12 characters.');
  process.exit(1);
}

try {
  await mongoose.connect(uri);
  for (const account of validAccounts) {
    const email = account.email.trim().toLowerCase();
    const hash = await bcrypt.hash(account.password, 12);
    const existing = await User.findOne({ email });
    if (existing) {
      existing.name = account.name;
      existing.role = account.role;
      existing.passwordHash = hash;
      existing.isActive = true;
      await existing.save();
      console.log(`Updated ${account.role} account: ${email}`);
    } else {
      await User.create({ name: account.name, email, role: account.role, passwordHash: hash });
      console.log(`Created ${account.role} account: ${email}`);
    }
  }
} catch (error) {
  console.error('Account seeding failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
