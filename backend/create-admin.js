// Script to create a default admin user for testing
const mongoose = require('mongoose');
const User = require('./models/users');
const Account = require('./models/accounts');
const { membership, preDefinedPermissions } = require('./models/membership');
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
      let changed = false;
      if (!existingUser.admin) { existingUser.admin = true; changed = true; }
      if (existingUser.state !== 'verified') { existingUser.state = 'verified'; changed = true; }
      if (existingUser.emailTokens && existingUser.emailTokens.verify) {
        existingUser.emailTokens.verify = '';
        changed = true;
      }
      if (changed) {
        await existingUser.save();
        console.log('Existing admin user updated (admin=true, verified).');
      } else {
        console.log('Admin user already exists (admin & verified).');
      }
      // Ensure membership exists
      const mem = await membership.findOne({
        user: existingUser._id,
        account: existingUser.defaultAccount,
        to: 'account'
      });
      if (!mem) {
        await membership.create({
          user: existingUser._id,
          account: existingUser.defaultAccount,
          group: '',
          organization: null,
          to: 'account',
          role: 'owner',
          perms: preDefinedPermissions.account_owner
        }).catch(() => {});
        console.log('Owner membership created for existing admin');
      }
      return; // Done
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
      state: 'verified',
      emailTokens: { verify: '', invite: '', resetPassword: '' },
      mfa: { enabled: false }
    });

    // Register user with password using passport-local-mongoose
    await User.register(user, 'admin');
    console.log('Created admin user: admin@flexiwan.com / admin');
    // Create owner membership for admin
    try {
      await membership.create({
        user: user._id,
        account: account._id,
        group: '',
        organization: null,
        to: 'account',
        role: 'owner',
        perms: preDefinedPermissions.account_owner
      });
      console.log('Owner membership created for admin');
    } catch (e) {
      console.warn('Failed creating owner membership (may already exist):', e.message);
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createDefaultAdmin();
