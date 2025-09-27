// flexiWAN SD-WAN software - flexiEdge, flexiManage.
// For more information go to https://flexiwan.com
// Copyright (C) 2020  flexiWAN Ltd.

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

const Service = require('./Service');

const Accounts = require('../models/accounts');
const Users = require('../models/users');
const pick = require('lodash/pick');
const { getToken } = require('../tokens');
const {
  getUserAccounts,
  orgUpdateFromNull
} = require('../utils/membershipUtils');

class AccountsService {
  /**
   * Select the API fields from mongo Account Object
   *
   * @param {mongo Account Object} item
   */
  static selectAccountParams (item, onlySubscriptionStatus = false) {
    const items = [
      '_id',
      'isSubscriptionValid',
      'trial_end',
      'forceMfa'
    ];
    if (!onlySubscriptionStatus) {
      items.push(...[
        'companyType',
        'companyDesc',
        'name',
        'country'
      ]);
    }
    const ret = pick(item, items);
    ret._id = ret._id.toString();
    return ret;
  }

  /**
   * Get all AccessTokens
   *
   * offset Integer The number of items to skip before starting to collect the result set (optional)
   * limit Integer The numbers of items to return (optional)
   * returns List
   *
   * Important Note: this API bypass account permission check, return only necessary info
   **/
  static async accountsGET ({ offset, limit }, { user }) {
    try {
      // This API bypass account permission check, make sure to return only necessary info
      const accounts = await getUserAccounts(user, offset, limit);
      return Service.successResponse(accounts);
    } catch (e) {
      return Service.rejectResponse(
        e.message || 'Internal Server Error',
        e.status || 500
      );
    }
  }

  /**
   * Retrieve account information
   *
   * id String Numeric ID of the Account to retrieve information
   * returns Account
   **/
  static async accountsIdGET ({ id }, { user }) {
    try {
      if (user.defaultAccount._id.toString() !== id) {
        return Service.rejectResponse(
          'No permission to access this account', 403
        );
      }
      const account = await Accounts.findOne({ _id: id });
      const result = AccountsService.selectAccountParams(account);
      return Service.successResponse(result);
    } catch (e) {
      return Service.rejectResponse(
        e.message || 'Internal Server Error',
        e.status || 500
      );
    }
  }

  /**
   * Retrieve account subscription status information
   *
   * id String Numeric ID of the Account to retrieve information
   * returns Account with only subscription status
   *
   * Important NOTE: This API bypass the account permission check, must return only necessary data
   **/
  static async accountsIdSubscriptionStatusGET ({ id }, { user }) {
    try {
      // Validate that user is accessing this API while he has access to this account
      if (user?.defaultAccount?._id.toString() !== id) {
        return Service.rejectResponse(
          'No permission to access this account', 403
        );
      }
      const account = await Accounts.findOne({ _id: id });
      // This API bypass permissions, return only needed info
      const result = AccountsService.selectAccountParams(account, true);
      return Service.successResponse(result);
    } catch (e) {
      return Service.rejectResponse(
        e.message || 'Internal Server Error',
        e.status || 500
      );
    }
  }

  /**
   * Modify account information
   *
   * id String Numeric ID of the Account to modify
   * accountRequest AccountRequest  (optional)
   * returns Account
   **/
  static async accountsIdPUT ({ id, ...accountRequest }, { user }, response) {
    try {
      if (user.defaultAccount._id.toString() !== id) {
        return Service.rejectResponse(
          'No permission to access this account', 403
        );
      }
      const {
        name, companyType, companyDesc, country, forceMfa
      } = accountRequest;

      const account = await Accounts.findOneAndUpdate(
        { _id: id },
        { $set: { name, companyType, companyDesc, country, forceMfa } },
        { upsert: false, new: true, runValidators: true });

      // Update token
      const token = await getToken({ user }, { accountName: account.name });
      response.setHeader('Refresh-JWT', token);

      const result = AccountsService.selectAccountParams(account);
      return Service.successResponse(result);
    } catch (e) {
      return Service.rejectResponse(
        e.message || 'Internal Server Error',
        e.status || 500
      );
    }
  }

  /**
   * Select account
   *
   * selectAccountRequest SelectAccountRequest
   * returns Account
   *
   * Important Note: This API bypass account permission check, return only necessary info
   **/
  static async accountsSelectPOST ({ ...accountSelectRequest }, req, res) {
    const user = req.user;
    const { account } = accountSelectRequest;

    try {
      if (!user.defaultAccount || !user.defaultAccount._id || !user._id) {
        return Service.rejectResponse('Error in selecting account', 500);
      }

      // If current account not changed, return OK
      if (user.defaultAccount._id.toString() === account) {
        // This API bypass permissions, return only needed info
        const result = AccountsService.selectAccountParams(user.defaultAccount, true);
        return Service.successResponse(result, 201);
      }

      const accounts = await getUserAccounts(user);
      const requestedAccount = accounts.find(acc => acc._id === account);
      if (!requestedAccount) {
        return Service.rejectResponse(
          'No permission to access this account', 403
        );
      }

      // if user logged in to account that doesn't force MFA on user,
      // but now wants to switch to account that does force it,
      // we don't allow it, The user should configure MFA for himself.
      if (!req.user.isLoggedInWithMfa && requestedAccount.forceMfa) {
        return Service.rejectResponse(
          'No permission to access this account. Two-Factor-authenticator is required', 403
        );
      }

      // Get organizations for the new account
      const updUser = await Users.findOneAndUpdate(
        // Query, use the email and account
        { _id: user._id },
        // Update account, set default org to null so the system
        // will choose an organization on login if something failed
        { defaultAccount: account, defaultOrg: null },
        // Options
        { upsert: false, new: true }
      ).populate('defaultAccount');

      // Set a default organization for the new account
      user.defaultAccount = updUser.defaultAccount;
      user.defaultOrg = null;

      await orgUpdateFromNull(req, res);
      // This API bypass account permissions check, return only needed info
      // Still it's returned only if user has any permission to access this account
      const result = AccountsService.selectAccountParams(updUser.defaultAccount, true);
      return Service.successResponse(result, 201);
    } catch (e) {
      return Service.rejectResponse(
        e.message || 'Internal Server Error',
        e.status || 500
      );
    }
  }

  /**
   * Create new account
   *
   * registerAccountRequest RegisterAccountRequest  (optional)
   * returns Account
   **/
  static async accountsPOST ({ registerAccountRequest }, { user }) {
    try {
      return Service.successResponse('');
    } catch (e) {
      return Service.rejectResponse(
        e.message || 'Internal Server Error',
        e.status || 500
      );
    }
  }
}

module.exports = AccountsService;
