// check-admin-status.js
const mongoose = require('mongoose');
const User = require('./models/users');
const configs = require('./configs')();

(async () => {
  try {
    await mongoose.connect(configs.get('mongoUrl'));
    const emails = ['admin@miwide.com', 'aikonlee@gmail.com'];
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
