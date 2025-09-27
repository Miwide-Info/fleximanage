// Script: list-users.js - prints registered users
const mongoose = require('mongoose');
const User = require('./models/users');
const configs = require('./configs')();

(async () => {
  try {
    const mongoUrl = configs.get('mongoUrl');
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB');

    const users = await User.find({}, {
      _id: 1,
      email: 1,
      username: 1,
      name: 1,
      lastName: 1,
      state: 1,
      admin: 1,
      defaultAccount: 1,
      createdAt: 1,
      updatedAt: 1
    }).sort({ createdAt: 1 }).lean();

    if (users.length === 0) {
      console.log('No users found');
    } else {
      console.log(`Total users: ${users.length}`);
      users.forEach(u => {
        const line = `${u._id} | ${u.email} | ${u.name} ${u.lastName}` +
          ` | state=${u.state} | admin=${u.admin}`;
        console.log(line);
      });
    }
  } catch (err) {
    console.error('Error listing users:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
})();
