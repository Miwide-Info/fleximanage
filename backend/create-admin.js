// Script to create a default admin user for testing
const mongoose = require('mongoose');
const User = require('./models/users');
const Account = require('./models/accounts');
const { membership } = require('./models/membership');
const configs = require('./configs')();

async function createDefaultAdmin () {
  try {
    // Connect to MongoDB
    const mongoUrl = configs.get('mongoUrl');
    await mongoose.connect(mongoUrl);

    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingUser = await User.findOne({ email: 'admin@flexiwan.com' });
    if (existingUser) {
      if (!existingUser.admin) {
        existingUser.admin = true;
        await existingUser.save();
        console.log('Existing admin user promoted: admin flag set to true');
      } else {
        console.log('Admin user already exists and is admin=true');
      }
      return;
    }

    // Create default account
    const account = new Account({
      name: 'Default Account',
      accountName: 'default',
      forceMfa: false,
      numSites: 1,
      serviceType: 'testing',
      companySize: '1-10',
      country: 'US'
    });
    await account.save();
    console.log('Created default account');

    // Create admin user
    const user = new User({
      email: 'admin@flexiwan.com',
      username: 'admin@flexiwan.com',
      name: 'Admin',
      lastName: 'User',
      jobTitle: 'Administrator',
      defaultAccount: account._id,
      admin: true,
      organizations: [{
        org: account._id,
        membership: membership.admin
      }],
      mfa: {
        enabled: false
      }
    });

    // Register user with password using passport-local-mongoose
    await User.register(user, 'admin');
    console.log('Created admin user: admin@flexiwan.com / admin');
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createDefaultAdmin();
