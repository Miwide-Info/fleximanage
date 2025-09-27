// flexiWAN SD-WAN software - flexiEdge, flexiManage.
// For more information go to https://flexiwan.com
// Copyright (C) 2019  flexiWAN Ltd.

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

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const mongoConns = require('../mongoConns.js')();
const validators = require('./validators');
const configs = require('../configs')();

/**
 * Organizations Database Schema
 */
const OrgSchema = new Schema({
  // organization name
  name: {
    type: String,
    required: true,
    match: [/^[a-z0-9- ]{1,50}$/i, 'Name should contain English characters, digits or spaces'],
    maxlength: [50, 'Name length must be at most 50']
  },
  // organization description
  description: {
    type: String,
    maxlength: [50, 'Name length must be at most 50'],
    validate: {
      validator: validators.validateDescription,
      message: 'Organization description format is invalid'
    },
    default: ''
  },
  // group name
  group: {
    type: String,
    required: true,
    unique: false,
    maxlength: [50, 'Group length must be at most 50']
  },
  // account Id
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'accounts'
  },
  encryptionMethod: {
    type: String,
    enum: [
      'none',
      'psk',
      'ikev2'
    ],
    default: 'psk'
  },
  vxlanPort: {
    type: String,
    default: configs.get('tunnelPort'),
    required: true,
    validate: {
      validator: validators.validateVxlanPort,
      message: 'vxlanPort should be a valid Port value'
    }
  },
  tunnelRange: {
    type: String,
    default: '10.100.0.0',
    required: true,
    validate: {
      validator: validators.validateTunnelRangeIP,
      message: 'tunnelRange must be a valid IP address'
    }
  }
});

// Default exports
module.exports = mongoConns.getMainDB().model('organizations', OrgSchema);
