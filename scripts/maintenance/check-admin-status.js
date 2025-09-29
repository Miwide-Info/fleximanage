// check-admin-status.js (moved from backend/)
// Usage:
//   node scripts/maintenance/check-admin-status.js email1@example.com email2@example.com ...

const mongoose = require('mongoose');
const path = require('path');
const backendRoot = path.join(__dirname, '../../backend');
// eslint-disable-next-line import/no-dynamic-require
const configs = require(path.join(backendRoot, 'configs'))();
// eslint-disable-next-line import/no-dynamic-require
const User = require(path.join(backendRoot, 'models/users'));

(async () => {
  try {
    await mongoose.connect(configs.get('mongoUrl'));
    const emails = process.argv.slice(2);
    if (emails.length === 0) {
      console.error('Usage: node scripts/maintenance/check-admin-status.js <email> [moreEmails...]');
      process.exit(1);
    }
    const users = await User.find({ email: { $in: emails } }, { email: 1, admin: 1 });
    users.forEach(u => {
      console.log(`${u.email}: admin = ${u.admin === true ? 'YES' : 'NO'}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
})();
