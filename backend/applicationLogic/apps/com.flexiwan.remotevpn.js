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

const Joi = require('joi');
const pick = require('lodash/pick');
const omit = require('lodash/omit');
const applications = require('../../models/applications');
const vpnUniqueUsers = require('../../models/vpnUniqueUsers');
const organizations = require('../../models/organizations');
const { devices } = require('../../models/devices');
const diffieHellmans = require('../../models/diffieHellmans');
const { validateFQDN } = require('../../models/validators');
const configs = require('../../configs')();
const { getRangeAndMask, getStartEndIp } = require('../../utils/networks');
const { getMajorVersion, getMinorVersion } = require('../../versioning');

const {
  generateRemoteVpnPKI,
  generateTlsKey
} = require('../../utils/certificates');

const flexibilling = require('../../flexibilling');

const vpnIdentifier = 'com.flexiwan.remotevpn';

const IApplication = require('../applicationsInterface');

class RemoteVpn extends IApplication {
  constructor () {
    super();
    this.actions = {
      createCertificates: async (application) => this.createCertificates(application)
    };
  }

  async pickAllowedFieldsOnly (configurationRequest) {
    return pick(configurationRequest, allowedFields);
  };

  async validateConfiguration (configurationRequest, application, account) {
    // validate user inputs
    const result = vpnConfigSchema.validate(configurationRequest);
    if (result.error) {
      return { valid: false, err: `${result.error.details[0].message}` };
    }

    // check if unique networkId already taken
    const networkId = configurationRequest.networkId;
    const regex = new RegExp(`\\b${networkId}\\b`, 'i');
    const existsNetworkId = await applications.findOne(
      {
        _id: { $ne: application._id },
        configuration: { $exists: 1 },
        'configuration.networkId': { $regex: regex }
      }
    );

    if (existsNetworkId) {
      const err = 'This workspace name is already in use by another account or organization. ' +
      'Please choose another workspace name';
      return { valid: false, err: err };
    }

    // get users portal numbers configured for the entire account
    // *except* of the requested application
    const usedPortalUsers = await this.getConfiguredPortalUsers(
      account._id, null, [application.org]);

    // add to the updated value to the count number
    const requestedPortalUsers = parseInt(configurationRequest.allowedPortalUsers);
    const totalPortalUsers = usedPortalUsers + requestedPortalUsers;

    // check if the total is more than the allowed for this account
    const accountId = account._id.toString();
    const allowedPortalUsers = await flexibilling.getFeatureMax(accountId, 'vpn_portal_users');

    if (totalPortalUsers > allowedPortalUsers) {
      const left = allowedPortalUsers - usedPortalUsers;
      let leftMsg = `${left} licenses are left in your Account. `;
      if (left <= 0) {
        leftMsg = 'No licenses are left in your Account. ';
      } else if (left === 1) {
        leftMsg = '1 license is left in your Account. ';
      }
      const err =
      `The number ${requestedPortalUsers} is too high for "Max Remote Worker Users". ${leftMsg}` +
      'Please contact your system provider for more information';
      return { valid: false, err: err };
    }

    // make sure that one auth method is enabled
    let oneAuthMethodIsEnabled = false;
    for (const authMethodType in configurationRequest.authentications) {
      if (configurationRequest.authentications[authMethodType].enabled) {
        oneAuthMethodIsEnabled = true;
        break;
      }
    }
    if (!oneAuthMethodIsEnabled) {
      return { valid: false, err: 'At least one authentication method must be enabled' };
    }

    return { valid: true, err: '' };
  };

  async getDeviceSpecificConfiguration (app, device, deviceConfiguration, idx) {
    const startIp = deviceConfiguration.networkStartIp;

    // vpn requires minimum of 8
    const num = Math.max(deviceConfiguration.connectionsNumber, 8);
    const { range, mask } = getRangeAndMask(num);
    const [deviceStartIp] = getStartEndIp(startIp, mask, range * idx);
    const subnet = `${deviceStartIp}/${mask}`;

    return { subnet, connections: deviceConfiguration.connectionsNumber };
  };

  async validateUninstallRequest (app, deviceList) {
    // check if firewall rules applied on the application interface
    for (const dev of deviceList) {
      if (!dev.firewall) continue;
      if (!dev.firewall.rules) continue;
      const outbound = dev.firewall.rules.some(r => {
        return r.direction === 'outbound' &&
          r.interfaces.some(ri => ri === `app_${app.appStoreApp.identifier}`);
      });

      if (outbound) {
        return {
          valid: false,
          err: `An outbound rule is configured in device "${dev.name}" for the application.
            Please remove it before uninstalling the application`
        };
      }
    }

    return { valid: true, err: '' };
  };

  async validateInstallRequest (application) {
    const configuredPort = application.configuration.serverPort;
    const isPortConfigured = configuredPort !== null && configuredPort !== '';
    if (!isPortConfigured) {
      return { valid: false, err: 'VPN Server port is not configured' };
    }

    return { valid: true, err: '' };
  }

  async validateDeviceConfigurationRequest (app, deviceConfiguration, deviceList) {
    // Make sure all devices with version 5.2.X and up
    if (deviceList.some(device => {
      const majorVersion = getMajorVersion(device.versions.agent);
      const minorVersion = getMinorVersion(device.versions.agent);
      return (majorVersion < 5 || (majorVersion === 5 && minorVersion < 2));
    })) {
      return {
        valid: false,
        err: 'Remote Worker VPN is supported from version 5.2.X,' +
          ' Some devices have lower version'
      };
    }

    // this field indicates that application configured.
    // There is no way to save only networkId without other configurations
    if (!app.configuration?.networkId) {
      return {
        valid: false,
        err: 'Remote Worker VPN is not configured properly. ' +
        'Check the installed application configuration page.'
      };
    }

    // prevent installation if there are missing required configurations
    // validate user inputs
    const result = vpnDeviceConfigSchema.validate(deviceConfiguration);
    if (result.error) {
      return { valid: false, err: `${result.error.details[0].message}` };
    }

    // make sure that requested VPN network is not overlapped with other networks in the org
    const startIp = deviceConfiguration.networkStartIp;

    const num = Math.max(deviceConfiguration.connectionsNumber, 8);
    const { range, mask } = getRangeAndMask(num);
    const vpnServerNetworks = deviceList.map((dev, idx) => {
      const [deviceStartIp] = getStartEndIp(startIp, mask, range * idx);
      return `${deviceStartIp}/${mask}`;
    });

    // "validateOverlappingSubnets" is injected to this class with "registerUtilFunc"
    const overlappingSubnets = await this.utils.validateOverlappingSubnets(
      app.org, vpnServerNetworks);

    for (const overlappingSubnet of overlappingSubnets) {
      const { type, subnet, overlappingWith, meta } = overlappingSubnet;

      let errMsg = `VPN network ${subnet} overlaps with `;

      if (type === 'lanInterface') {
        errMsg += `address ${overlappingWith} of the LAN interface `;
        errMsg += `${meta.interfaceName} in device ${meta.deviceName}`;
        return { valid: false, err: errMsg };
      }

      if (type === 'tunnel') {
        errMsg += `flexiWAN tunnel range (${overlappingWith})`;
        return { valid: false, err: errMsg };
      }

      if (type === 'application') {
        // If the user desires to override the application configuration on a device,
        // there should be no checking for overlapping with the current configuration.
        if (meta.appId === app._id.toString()) {
          if (deviceList.some(d => d._id.toString() === meta.deviceId)) {
            continue;
          }
        }

        errMsg += `address ${overlappingWith} of the application `;
        errMsg += `${meta.appName} in device ${meta.deviceName}`;
        return { valid: false, err: errMsg };
      }
    }

    return { valid: true, err: '' };
  };

  async createCertificates (application) {
    const pems = await generateRemoteVpnPKI(application.org.toString());
    const tlsKey = generateTlsKey();

    const dhKeyDoc = await diffieHellmans.findOne();
    if (!dhKeyDoc) {
      // DH stack should be fulfilled automatically in vpn portal server
      throw new Error(
        'An error occurred while creating a DH key for your organization. ' +
        'Please try again later');
    }

    const dhKey = dhKeyDoc.key;
    await diffieHellmans.remove({ _id: dhKeyDoc._id });

    const keysObj = {
      caKey: pems.caKey,
      caCrt: pems.caCert,
      serverKey: pems.serverKey,
      serverCrt: pems.serverCert,
      clientKey: pems.clientKey,
      clientCrt: pems.clientCert,
      tlsKey,
      dhKey
    };

    await applications.updateOne(
      { _id: application._id },
      { $set: { 'configuration.keys': keysObj } }
    );

    return keysObj;
  }

  /**
   * Generate key for vpn server
   * @param {object} application the application to generate for
   * @return {{
      isNew: boolean
      caKey: string
      caCrt: string
      serverKey: string
      serverCrt: string
      clientKey: string
      clientCrt: string
      tlsKey: string
      dhKey: string
    }}  the keys to send to device
   */
  async getDeviceKeys (application) {
    let isNew = false;

    let keys = null;
    if (!application.configuration.keys) {
      isNew = true;
      keys = await this.createCertificates(application);
    } else {
      keys = application.configuration.keys;
    }

    return {
      isNew: isNew,
      caKey: keys.caKey,
      caCrt: keys.caCrt,
      serverKey: keys.serverKey,
      serverCrt: keys.serverCrt,
      clientKey: keys.clientKey,
      clientCrt: keys.clientCrt,
      tlsKey: keys.tlsKey,
      dhKey: keys.dhKey
    };
  };

  async getTasks (device, application, op, params) {
    const tasks = [];

    if (op === 'install') {
      const installParams = await this.getParams(device, application, op);
      const configParams = await this.getParams(device, application, 'config');
      tasks.push({
        entity: 'agent',
        message: 'add-app-install',
        params: {
          ...params,
          ...installParams
        }
      });
      tasks.push({
        entity: 'agent',
        message: 'add-app-config',
        params: {
          ...params,
          ...configParams
        }
      });
    } else if (op === 'config') {
      const configParams = await this.getParams(device, application, op);
      tasks.push({
        entity: 'agent',
        message: 'add-app-config',
        params: {
          ...params,
          ...configParams
        }
      });
    } else if (op === 'uninstall') {
      const uninstallParams = await this.getParams(device, application, op);
      tasks.push({
        entity: 'agent',
        message: 'remove-app-install',
        params: {
          ...params,
          ...uninstallParams
        }
      });
    }

    return tasks;
  };

  /**
   * Generate params object to be sent to the device
   * @param {object} device the device to get params for
   * @param {object} application the application to be installed
   * @param {string} op the operation of the job (install, config, etc.)
   * @return {object} params to be sent to device
  */
  async getParams (device, application, op) {
    const params = {};

    const config = application.configuration;

    if (op === 'config') {
      const {
        isNew, caKey, caCrt,
        serverKey, serverCrt, clientKey, clientCrt, tlsKey, dhKey
      } = await this.getDeviceKeys(application);

      // if is new keys, save them on db
      if (isNew) {
        const keysObj = { caKey, caCrt, serverKey, serverCrt, clientKey, clientCrt, tlsKey, dhKey };
        // store the keys in the "application" variable as well.
        // If user selected multiple devices to install the application,
        // we need to ensure that we don't generate different keys
        // for each device. Hence we saving in DB and in variable.
        application.configuration.keys = keysObj;
      }

      const dnsIps = config.dnsIps && config.dnsIps !== ''
        ? config.dnsIps.split(/\s*,\s*/) : [];

      const dnsDomains = config.dnsDomains && config.dnsDomains !== ''
        ? config.dnsDomains.split(/\s*,\s*/) : [];

      params.routeAllTrafficOverVpn = config.routeAllTrafficOverVpn || false;
      params.port = config.serverPort ? config.serverPort : '';
      params.caCrt = caCrt;
      params.serverKey = serverKey;
      params.serverCrt = serverCrt;
      params.tlsKey = tlsKey;
      params.dnsIps = dnsIps;
      params.dnsDomains = dnsDomains;
      params.dhKey = dhKey;
      params.vpnTmpTokenTime = configs.get('vpnTmpTokenTime');

      const majorVersion = getMajorVersion(device.versions.agent);

      const flexiVpnServer = configs.get('flexiVpnServer'); // can be string or list
      const isFlexiVpnServerArray = Array.isArray(flexiVpnServer);
      if (majorVersion >= 6) { // from 6 version, list should be sent
        params.vpnPortalServer = isFlexiVpnServerArray ? flexiVpnServer : [flexiVpnServer];
      } else { // Otherwise, string should be sent.
        params.vpnPortalServer = isFlexiVpnServerArray ? flexiVpnServer[0] : flexiVpnServer;
      }

      // get per device configuration
      const deviceApplication = device.applications.find(
        a => a.app._id.toString() === application._id.toString());
      params.vpnNetwork = deviceApplication.configuration.subnet;
      params.connections = deviceApplication.configuration.connections;
    }

    return { applicationParams: params };
  };

  async needToUpdatedDevices (oldConfig, updatedConfig) {
    if (oldConfig.serverPort !== updatedConfig.serverPort) return true;
    if (oldConfig.dnsIps !== updatedConfig.dnsIps) return true;
    if (oldConfig.dnsDomains !== updatedConfig.dnsDomains) return true;
    if (oldConfig.routeAllTrafficOverVpn !== updatedConfig.routeAllTrafficOverVpn) return true;
    return false;
  };

  async getApplicationSubnet (app) {
    const apps = await devices.aggregate([
      { $match: { org: app.org, 'applications.app': app._id } },
      {
        $project: {
          _id: 1,
          name: 1,
          applications: {
            $filter: { input: '$applications', cond: { $eq: ['$$this.app', app._id] } }
          }
        }
      },
      { $unwind: { path: '$applications' } },
      {
        $project: {
          subnet: '$applications.configuration.subnet',
          deviceName: '$name',
          deviceId: '$_id'
        }
      }
    ]).allowDiskUse(true);

    return apps;
  };

  async getConfiguredPortalUsers (account, org = null, exclude = null) {
    const match = {
      account: account
    };

    if (org) match._id = org;
    if (exclude) match._id = { $nin: exclude };

    const pipeline = [
      { $match: match },
      { $project: { _id: 1 } },
      {
        $lookup: {
          from: 'applications',
          localField: '_id',
          foreignField: 'org',
          as: 'applications'
        }
      },
      { $unwind: { path: '$applications' } },
      {
        $lookup: {
          from: 'applicationStore',
          localField: 'applications.appStoreApp',
          foreignField: '_id',
          as: 'appStoreApp'
        }
      },
      { $unwind: { path: '$appStoreApp' } },
      { $match: { 'appStoreApp.identifier': vpnIdentifier } },
      { $project: { users: { $toInt: '$applications.configuration.allowedPortalUsers' } } },
      { $group: { _id: null, count: { $sum: '$users' } } }
    ];

    let portalUsers = await organizations.aggregate(pipeline).allowDiskUse(true);
    portalUsers = portalUsers.length > 0 ? portalUsers[0].count : 0;
    return portalUsers;
  };

  async updateApplicationBilling (app) {
    const org = await organizations.findOne({ _id: app.org }, 'account').lean();

    const { orgConnections, accountConnections } = await this.getBillingData(
      org.account, app.org);

    await flexibilling.updateFeature(
      org.account, app.org, 'vpn_portal_users', accountConnections, orgConnections);
  };

  async selectConfigurationParams (configuration) {
    const keysExist = configuration.keys && 1; // "&& 1" to return a boolean, not the keys object.
    const res = omit(configuration, secretFields);
    res.keysExist = keysExist;
    return res;
  };

  async getBillingData (account, org) {
    const orgConnections = await this.getConfiguredPortalUsers(account, org, null);
    const accountConnections = await this.getConfiguredPortalUsers(account, null, null);
    return { orgConnections, accountConnections };
  };

  async getApplicationStats (account, org) {
    const status = {};
    const { orgConnections, accountConnections } = await this.getBillingData(account, org);
    status.orgConnections = orgConnections;
    status.accountConnections = accountConnections;

    const uniqueUsers = await vpnUniqueUsers.findOne({ organizationId: org });
    status.actualConnections = uniqueUsers ? uniqueUsers.uniqueUsers : [];

    return status;
  };

  async performApplicationAction (application, action, params) {
    if (!(action in this.actions)) {
      return { res: false, err: `The action ${action} is not supported` };
    }

    return await this.actions[action](application, params);
  }
}

const allowedFields = [
  'networkId',
  'serverPort',
  'routeAllTrafficOverVpn',
  'dnsIps',
  'dnsDomains',
  'authentications',
  'allowedPortalUsers'
];

const secretFields = [
  'keys'
  // TODO: what about private key of gsuite service account?
];
const vpnConfigSchema = Joi.object().keys({
  networkId: Joi.string().pattern(/^[A-Za-z0-9]+$/).min(3).max(20)
    .invalid(
      'company', 'acme', 'SASE', 'sase', 'security', 'info'
    ).pattern(/flexiwan/i, { invert: true }).required()
    .error(errors => {
      errors.forEach(err => {
        switch (err.code) {
          case 'any.invalid':
          case 'string.pattern.invert.base':
            err.message = `${err.local.value} is not allowed for Workspace name`;
            break;
          default:
            break;
        }
      });
      return errors;
    }),
  serverPort: Joi.number().port().required(),
  routeAllTrafficOverVpn: Joi.boolean().required(),
  allowedPortalUsers: Joi.number().min(1).required(),
  dnsIps: Joi.string().custom((val, helpers) => {
    const domainList = val.split(/\s*,\s*/);

    const ipSchema = Joi.string().ip({ version: ['ipv4'], cidr: 'forbidden' });

    const valid = domainList.every(d => {
      const res = ipSchema.validate(d);
      return res.error === undefined;
    });

    if (valid) {
      return val;
    } else {
      return helpers.message('dnsIps is not valid');
    }
  }).allow('').optional(),
  dnsDomains: Joi.string().custom((val, helpers) => {
    const domainList = val.split(/\s*,\s*/);
    const valid = domainList.every(d => validateFQDN(d));
    if (!valid) {
      return helpers.message('dnsDomains is not valid');
    };

    return val;
  }).allow('').optional(),
  authentications: Joi.object({
    gsuite: Joi.object().keys({
      enabled: Joi.boolean().required(),
      domains: Joi.array().items(Joi.object().keys({
        domain: Joi.string().required().domain({ tlds: true })
          .pattern(/^\S+$/, 'domain without whitespace').invalid('gmail.com')
          .error(errors => {
            errors.forEach(err => {
              switch (err.code) {
                case 'any.invalid':
                  err.message = '"gmail.com" domain is not allowed';
                  break;
                default:
                  break;
              }
            });
            return errors;
          }),
        groups: Joi.string().required().allow(''),
        clientEmail: Joi.string().when('groups', {
          is: '',
          then: Joi.allow(''),
          otherwise: Joi.string().email()
        }).required(),
        privateKey: Joi.string().when('groups', {
          is: '',
          then: Joi.allow(''),
          otherwise: Joi.string()
        }).required(),
        impersonateEmail: Joi.string().when('groups', {
          is: '',
          then: Joi.allow(''),
          otherwise: Joi.string().email()
        }).required()
      })).required().when('enabled', { is: true, then: Joi.array().min(1) })
    }).required(),
    office365: Joi.object().keys({
      enabled: Joi.boolean().required(),
      domains: Joi.array().items(Joi.object().keys({
        domain: Joi.string().required()
          .domain({ tlds: true }).pattern(/^\S+$/, 'domain without whitespace'),
        groups: Joi.string().required().allow('')
      })).required().when('enabled', { is: true, then: Joi.array().min(1) })
    }).required(),
    flexiManage: Joi.object().keys({
      enabled: Joi.boolean().required()
    }).required()
  })
});

const vpnDeviceConfigSchema = Joi.object().keys({
  connectionsNumber: Joi.number().min(1).required(),
  networkStartIp: Joi.string().ip({ version: ['ipv4'] }).required()
});

module.exports = RemoteVpn;
