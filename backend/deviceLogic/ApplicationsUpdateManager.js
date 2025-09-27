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

const logger = require('../logging/logging')({ module: module.filename, type: 'periodic' });
const configs = require('../configs')();
const fetchUtils = require('../utils/fetchUtils');
const applicationStore = require('../models/applicationStore');
const applications = require('../models/applications');
const organizations = require('../models/organizations');
const { membership } = require('../models/membership');
const ObjectId = require('mongoose').Types.ObjectId;
const notificationsMgr = require('../notifications/notifications')();
const mailer = require('../utils/mailer')(
  configs.get('mailerHost'),
  configs.get('mailerPort'),
  configs.get('mailerBypassCert')
);

/***
 * This class serves as the applications update manager, responsible for
 * polling the repository for applications file and replacement of the
 * file in the database when remote update time has changed.
 ***/
class ApplicationsUpdateManager {
  /**
    * Creates a ApplicationsUpdateManager instance
    */
  constructor () {
    this.applicationsUri = configs.get('applicationsUrl');
  }

  /**
    * A static singleton that creates an ApplicationsUpdateManager Instance.
    *
    * @static
    * @return an instance of an ApplicationsUpdateManager class
    */
  static getApplicationsManagerInstance () {
    if (applicationsUpdater) return applicationsUpdater;
    applicationsUpdater = new ApplicationsUpdateManager();
    return applicationsUpdater;
  }

  /**
    * Upgrade application version on devices if needed.
    * if yes - notify and send emails
    * @async
    * @param {application} appStoreApp
    * @param {Boolean}
    * @return {void}
    */
  async checkDevicesUpgrade (appStoreApp) {
    // get devices with old version of appStoreApp
    const oldVersionsDevices = await applications.aggregate([
      {
        $match: {
          appStoreApp: ObjectId(appStoreApp._id),
          installedVersion: { $ne: appStoreApp.latestVersion },
          pendingToUpgrade: { $ne: true }
        }
      },
      {
        $lookup: {
          from: 'devices',
          localField: '_id',
          foreignField: 'applications.app',
          as: 'devices'
        }
      },
      {
        $project: {
          installedVersion: 1,
          org: 1,
          'devices._id': 1,
          'devices.machineId': 1,
          'devices.name': 1
        }
      }
    ]);

    if (oldVersionsDevices.length) {
      const notifications = [];

      for (let i = 0; i < oldVersionsDevices.length; i++) {
        const app = oldVersionsDevices[i];
        const devices = app.devices;

        if (devices.length) {
          const oldVersion = app.installedVersion;
          const newVersion = appStoreApp.latestVersion;

          devices.forEach(device => {
            notifications.push({
              org: app.org,
              title: `Application ${appStoreApp.name} upgrade`,
              details: 'This application requires upgrade from version ' + oldVersion +
              ' to ' + newVersion + ' in the device ' + device.name,
              targets: {
                deviceId: device._id,
                tunnelId: null,
                interfaceId: null
                // policyId: null
              },
              eventType: 'Software update',
              resolved: true,
              isInfo: true
            });
          });

          // mark as sent upgrade message
          await applications.updateOne(
            { _id: app._id },
            { $set: { pendingToUpgrade: true } }
          );

          const organization = await organizations.findOne({ _id: app.org });

          const memberships = await membership.find({
            account: organization.account,
            to: 'account',
            role: 'owner'
          }, 'user').populate('user');

          const emailAddresses = memberships.map(doc => { return doc.user.email; });

          // TODO: fix email template
          await mailer.sendMailHTML(
            configs.get('mailerFromAddress'),
            emailAddresses,
            `Upgrade Your ${appStoreApp.name} Application`,
            `<h2>Your application needs to upgrade</h2><br>
            <b>Click below to upgrade your application:</b>
            <p><a href="${configs.get('uiServerUrl')}/applications">
            <button style="color:#fff;background-color:#F99E5B;
            border-color:#F99E5B;font-weight:400;text-align:center;
            vertical-align:middle;border:1px solid transparent;
            padding:.375rem .75rem;font-size:1rem;line-height:1.5;
            border-radius:.25rem;
            cursor:pointer">Upgrade Application</button></a></p>
            <p>Yours,<br>
            The flexiWAN team</p>`
          );
        }
      }

      await notificationsMgr.sendNotifications(notifications);
    }
  }

  /**
    * Polls the applications file
    * @async
    * @return {void}
    */
  async pollApplications () {
    logger.info('Begin fetching appStore file', {
      params: { applicationsUri: this.applicationsUri }
    });
    try {
      const body = await fetchUtils.fetchWithRetry(this.applicationsUri, 3);
      logger.debug('Imported applications response received', {
        params: { time: body.meta.time, rulesCount: body.applications.length }
      });

      const appList = body.applications || [];

      const options = {
        upsert: true,
        useFindAndModify: false,
        new: true,
        runValidators: true
      };

      let isUpdated = false;

      for (let i = 0; i < appList.length; i++) {
        // skip if app is not changed on repository
        let app = await applicationStore.findOne({ identifier: appList[i].identifier });
        if (app && app.repositoryTime === body.meta.time) {
          continue;
        }

        isUpdated = true;

        const set = { $set: { repositoryTime: body.meta.time, ...appList[i] } };
        app = await applicationStore.findOneAndUpdate(
          { identifier: appList[i].identifier },
          set,
          options
        );

        // check if devices needs to upgrade
        // await this.checkDevicesUpgrade(app);
      }

      if (isUpdated) {
        logger.info('appStore database updated', {
          params: { time: body.meta.time, appsCount: appList.length }
        });
      }
    } catch (err) {
      logger.error('Failed to query applications file', {
        params: { err: err.message }
      });
    }
  }
}

let applicationsUpdater = null;
module.exports = {
  getApplicationsManagerInstance: ApplicationsUpdateManager.getApplicationsManagerInstance
};
