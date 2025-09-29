// Script: promote-user-admin.js
// Usage:
//   Promote: node promote-user-admin.js userEmail@example.com
//   Demote : node promote-user-admin.js --demote userEmail@example.com
// Sets admin flag for the specified user.

const mongoose = require('mongoose');
const User = require('./models/users');
const configs = require('./configs')();

(async () => {
  const demoteIdx = process.argv.indexOf('--demote');
  const demote = demoteIdx !== -1;
  const targetEmail = process.argv.filter(a => !a.startsWith('--')).slice(2)[0];
  if (!targetEmail) {
    console.error('Usage: node promote-user-admin.js [--demote] <email>');
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
    console.error('Error promoting user:', err.message);
    process.exit(3);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
})();
