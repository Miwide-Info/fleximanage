// Script: promote-user-admin.js (moved from backend/)
// Usage:
//   Promote: node scripts/maintenance/promote-user-admin.js userEmail@example.com
//   Demote : node scripts/maintenance/promote-user-admin.js --demote userEmail@example.com
// Sets admin flag for the specified user.

const mongoose = require('mongoose');
const path = require('path');
// Resolve backend path relative to this script location
const backendRoot = path.join(__dirname, '../../backend');
// Load backend modules
// eslint-disable-next-line import/no-dynamic-require
const configs = require(path.join(backendRoot, 'configs'))();
// eslint-disable-next-line import/no-dynamic-require
const User = require(path.join(backendRoot, 'models/users'));

(async () => {
  const demoteIdx = process.argv.indexOf('--demote');
  const demote = demoteIdx !== -1;
  const targetEmail = process.argv.filter(a => !a.startsWith('--')).slice(2)[0];
  if (!targetEmail) {
    console.error('Usage: node scripts/maintenance/promote-user-admin.js [--demote] <email>');
    process.exit(1);
  }
  try {
    const mongoUrl = configs.get('mongoUrl');
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email: targetEmail });
    if (!user) {
      console.error('User not found:', targetEmail);
      process.exit(2);
    }
    if (demote) {
      if (user.admin !== true) {
        console.log('User already non-admin:', targetEmail);
      } else {
        user.admin = false;
        await user.save();
        console.log('User demoted (admin=false):', targetEmail);
      }
    } else {
      if (user.admin === true) {
        console.log('User already admin:', targetEmail);
      } else {
        user.admin = true;
        await user.save();
        console.log('User promoted to admin:', targetEmail);
      }
    }
  } catch (err) {
    console.error('Error promoting/demoting user:', err.message);
    process.exit(3);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
})();
