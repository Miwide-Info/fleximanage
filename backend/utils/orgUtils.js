// flexiWAN SD-WAN software - flexiEdge, flexiManage.
// For more information go to https://flexiwan.com
// Copyright (C) 2022  flexiWAN Ltd.

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

const { devices } = require('../models/devices');
const { checkOverlapping } = require('./networks');

/**
 * Get all LAN subnets in the organization
 * @param  {[string]}      orgIds         ids of the organizations
 * @param  {[string]}    subnetsToCheck   array with subnets to check overlapping with
 * @param  {[objectId]?} excludeDevices   array with devices ids to not check
 * @return {[
 *  {_id: objectId, name: string, interfaceName: string, subnet: string}
 * ]} array of overlapping LAN subnets
 */
const checkLanOverlappingWith = async (orgIds, subnetsToCheck) => {
  const subnets = await devices.aggregate([
    { $match: { org: { $in: orgIds } } },
    {
      $project: {
        'interfaces.devId': 1,
        'interfaces.IPv4': 1,
        'interfaces.IPv4Mask': 1,
        'interfaces.name': 1,
        'interfaces.type': 1,
        'interfaces.isAssigned': 1,
        name: 1,
        versions: 1,
        _id: 1
      }
    },
    { $unwind: '$interfaces' },
    {
      $match: {
        'interfaces.type': 'LAN',
        'interfaces.isAssigned': true,
        'interfaces.IPv4': { $ne: '' },
        'interfaces.IPv4Mask': { $ne: '' }
      }
    },
    {
      $project: {
        _id: 1,
        versions: 1,
        deviceName: '$name',
        interfaceName: '$interfaces.name',
        interfaceDevId: '$interfaces.devId',
        interfaceSubnet: [{
          $concat: ['$interfaces.IPv4', '/', '$interfaces.IPv4Mask']
        }] // put is as array in order to pass "array" to the $function below
      }
    },
    {
      $addFields: {
        isOverlappingWith: {
          $function: {
            body: checkOverlapping.toString(),
            args: ['$interfaceSubnet', subnetsToCheck],
            lang: 'js'
          }
        }
      }
    },
    { $match: { 'isOverlappingWith.0': { $exists: true } } },
    {
      $addFields: {
        isOverlappingWith: { $arrayElemAt: ['$isOverlappingWith', 0] },
        interfaceSubnet: { $arrayElemAt: ['$interfaceSubnet', 0] }
      }
    }
  ]);

  return subnets;
};

const getAllOrganizationBGPDevices = async orgId => {
  const bgpDevices = await devices.aggregate([
    { $match: { org: orgId, 'bgp.enable': true } },
    { $project: { name: 1, bgp: 1 } }
  ]);
  return bgpDevices;
};

// Default exports
module.exports = {
  checkLanOverlappingWith,
  getAllOrganizationBGPDevices
};
