// flexiWAN SD-WAN software - flexiEdge, flexiManage.
// For more information go to https://miwide.com
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

/****************************************************************************
 * This module specifies the server configuration for different environments
 * The server uses the default configuration
 * The default configuration is overridden by running with the environment
 * variable in npm:  npm start <environment>
 ****************************************************************************/
/* eslint-disable max-len */
const os = require('os');
const fs = require('fs');
const path = require('path');

// Dynamic detection of a frontend build directory. Priority order:
// 1. ../frontend/build (new open-source React UI location)
// 2. client/build      (legacy path)
// 3. public            (very old fallback / minimal assets)
// The chosen value becomes the default "clientStaticDir" for environments that do not
// explicitly override it (most env overrides below DO set ../frontend/build already).
let detectedClientStaticDir = 'public';
try {
  const candidates = [
    path.join(__dirname, '..', 'frontend', 'build', 'index.html'),
    path.join(__dirname, 'client', 'build', 'index.html')
  ];
  for (const full of candidates) {
    if (fs.existsSync(full)) {
      // Store relative path if possible (for nicer logs); fall back to absolute.
      if (full.includes(path.join('..', 'frontend', 'build'))) {
        detectedClientStaticDir = '../frontend/build';
      } else if (full.includes(path.join('client', 'build'))) {
        detectedClientStaticDir = 'client/build';
      } else {
        detectedClientStaticDir = full; // absolute fallback
      }
      break;
    }
  }
} catch (e) {
  // Non-fatal; will fall back to 'public'. Intentionally quiet to avoid noisy boot logs.
}
// Use 127.0.0.1 instead of 'localhost' to avoid cases where localhost resolves to ::1 (IPv6) while mongod listens only on IPv4
const hostname = process.env.MONGO_HOST || '127.0.0.1';
const configEnv = {
  // This is the default configuration, override by the following sections
  default: {
    // URL of the rest server
    restServerUrl: ['https://local.miwide.com:3443'],
    // URL of the UI server
    uiServerUrl: ['https://local.miwide.com:3000'],
    // Key used for users tokens, override default with environment variable USER_SECRET_KEY
    userTokenSecretKey: 'abcdefg1234567',
    // Whether to validate open API response. True for testing and dev, False for production,
    // to remove unneeded fields from the response, use validateOpenAPIResponse = { removeAdditional: 'failing' }
    validateOpenAPIResponse: true,
    // Whether to validate open API request, now False for all.
    // Not described in schema fields will be removed if true,
    validateOpenAPIRequest: false,
    // Number of REST requests allowed in 5 min per IP address, more requests will be rate limited
    userIpReqRateLimit: 300,
    // Unread notification email period (in msec), a mail is sent once a period
    unreadNotificationPeriod: 86400000,
    // Max.number of unread notifications included into periodic email
    unreadNotificationsMaxSent: 50,
    // The duration of the user JWT token in seconds
    userTokenExpiration: 300,
    // The duration of the user refresh token in seconds
    userRefreshTokenExpiration: 604800,
    // The time to wait for job response before declaring the job as timeout
    jobTimeout: 180000,
    // The time to wait for deviceSendMessage response before declaring the req as timeout
    directMessageTimeout: 15000,
    // Period to send get-device-stats message to all connected devices, in msec
    statsPollPeriod: 30000,
    // The time to wait processing of the get-device-stats message until the next will be sent, in msec
    statsTimeout: 120000,
    // The time to retain jobs until deleted from the database, in msec
    jobRetainTimeout: 604800000,
    // Key used for device tokens, override default with environment variable DEVICE_SECRET_KEY
    deviceTokenSecretKey: 'abcdefg1234567',
    // Allowed servers for token creation (fallback for all environments)
    tokenAllowedServers: 'https://local.miwide.com:3443,http://local.miwide.com:3000,https://manage.miwide.com:3443,https://manage.miwide.com:443,https://manage.miwide.com:4443,https://manage.miwide.com,local.miwide.com:3443,manage.miwide.com:443,manage.miwide.com',
  // Key used to validate google captcha token (server secret). Can be supplied via env CAPTCHA_SECRET_KEY.
  // Empty string means backend will NOT verify with Google (dev convenience) and will trust client side.
  captchaKey: process.env.CAPTCHA_SECRET_KEY || '',
    // Mongo main database
    mongoUrl: `mongodb://${hostname}:27017,${hostname}:27018,${hostname}:27019/flexiwan?replicaSet=rs`,
    // Mongo analytics database
    mongoAnalyticsUrl: `mongodb://${hostname}:27017,${hostname}:27018,${hostname}:27019/flexiwanAnalytics?replicaSet=rs`,
    // Mongo Billing database
    mongoBillingUrl: `mongodb://${hostname}:27017,${hostname}:27018,${hostname}:27019/flexibilling?replicaSet=rs`,
    // Mongo VPN database
    mongoVpnUrl: `mongodb://${hostname}:27017,${hostname}:27018,${hostname}:27019/flexivpn?replicaSet=rs`,
    // Billing Redirect OK page url
    billingRedirectOkUrl: 'https://local.miwide.com/ok.html',
    // Biling config site - this is used as the billing site name in ChargeBee
    billingConfigSite: 'flexiwan-test',
    // ChargeBee default plan for a new customer
    billingDefaultPlan: 'enterprise-standard',
    // Wheter to enable billing
    useFlexiBilling: false,
    // API key for ChargeBee Billing config site. Not used when useFlexiBilling is false
    billingApiKey: '',
    // Use flexibilling charger scheduler to close invoices automatically
    // when set to "false", invoices should be closed manually
    useBillingCharger: false,
    // Use automatic charges collection
    autoCollectionCharges: 'off', // "on" or "off"
    // Redis host and port, override default with environment variable REDIS_URL
    // If 'requirepass' enabled in redis configuration use 'redis://authpass@host:port'
    redisUrl: 'redis://localhost:6379',
    // Redis connectivity options
    redisTotalRetryTime: 1000 * 60 * 60,
    redisTotalAttempts: 10,
    // Kue prefix
    kuePrefix: 'deviceq',
    // devices info channel name, devices will publish statuses to this common channel
    devInfoChannelName: 'fw-dev-info',
    // devices channel prefix, will be used for unique channel name of every device
    deviceChannelPrefix: 'fw-dev',
    // host channel prefix, will be used for unique channel name of every host
    hostChannelPrefix: 'fw-host',
    // unique sequence key with expiration time will be set for every socket message
    // to store the hostId which will proceed the response
    sequencePrefix: 'fw-seq',
    sequenceExpireTime: 300,
    // unique device key, will be set on connect and updated on web-socket pong response
    // the device will be considered as disconnected on expiration of this key
    connectDevicePrefix: 'fw-conn',
    connectExpireTime: 300,
    // HTTP port of the node server. On production we usually forward port 80 to this port using:
    // sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 3000
    httpPort: 3000,
    // HTTPS port of the node server. On production weWe usually forward port 443 to this port using:
    // sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 443 -j REDIRECT --to-port 3443
    httpsPort: 3443,
    // This port is used when redirecting the client
    // In production it can be set
    redirectHttpsPort: 3443,
    // Should we redirect to https, should be set to false if running behind a secure proxy such as CloudFlare
    shouldRedirectHttps: false,
    // Certificate key location, under bin directory
    // On production if the key located in the Let's encrypt directory, it's possible to link to it using:
    // sudo ln -s /etc/letsencrypt/live/app.miwide.com/privkey.pem ~/FlexiWanSite/bin/cert.app.miwide.com/domain.key
    httpsCertKey: '/cert.local.miwide.com/domain.key',
    // Certificate location, under bin directory
    // On production if the key located in the Let's encrypt directory, it's possible to link to it using:
    // sudo ln -s /etc/letsencrypt/live/app.miwide.com/fullchain.pem ~/FlexiWanSite/bin/cert.app.miwide.com/certificate.pem
    httpsCert: '/cert.local.miwide.com/certificate.pem',
    // Default agent broker the device tries to create connection for
    // The broker is sent to the device when it registers.
    // It's possible to use multiple brokers in case of multiple domains, in that case
    // the system will use the last broker that matches the domain used in the token or the first broker if not found
    agentBroker: ['manage.miwide.com:3443'],
    // Whitelist of allowed domains for CORS checks
    corsWhiteList: ['http://local.miwide.com:3000', 'https://local.miwide.com:3000', 'https://local.miwide.com:3443', 'https://manage.miwide.com:3443', 'https://127.0.0.1:3000', 'http://localhost:3000'],
  // Client static root directory (auto-detected: prefers production build if exists)
  clientStaticDir: detectedClientStaticDir,
    // Mgmt-Agent protocol version
    agentApiVersion: '6.0.0',
    // Mgmt log files
    logFilePath: './logs/app.log',
    reqLogFilePath: './logs/req.log',
    // Logging default level
    logLevel: 'verbose',
    // Hostname of SMTP server - for sending mails
    mailerHost: '127.0.0.1',
    // Port of SMTP server
    mailerPort: 25,
    // Bypass mailer certificate validation
    mailerBypassCert: false,
    // From address used when sending emails
    mailerFromAddress: 'noreply@miwide.com',
    // Mail envelop from address
    mailerEnvelopeFromAddress: 'flexiWAN <noreply@miwide.com>',
    // Allow users registration, otherwise by invitation only
    allowUsersRegistration: true,
    // Software version query link
    SwRepositoryUrl: 'https://deb.miwide.com/info/flexiwan-router/latest',
    // Software version update email link. ${version} is replaced in run time
    // eslint-disable-next-line no-template-curly-in-string
    SwVersionUpdateUrl: 'https://sandbox.miwide.com/Templates/notification_email_${version}.json',
    // Web hooks add user URL, used to send for new uses, '' to bypass hook
    webHookAddUserUrl: '',
    // Web hooks add user secret, send in addition to the message for filtering
    webHookAddUserSecret: 'ABC',
    // Web hooks register device URL, used to send for new registered devices, '' to bypass hook
    webHookRegisterDeviceUrl: '',
    // Web hooks register device secret, send in addition to the message for filtering
    webHookRegisterDeviceSecret: 'ABC',
    // Global app identification rules file location
    appRulesUrl: 'https://sandbox.miwide.com/Protocols/app-rules.json',
    // Global applications file locations
    applicationsUrl: 'https://sandbox.miwide.com/Templates/applications.json',
    // Default port for tunnels
    tunnelPort: '4789',
    // If to allow manager role to delete organizations, devices, tokens, tunnels, appIdentifications,
    //  users, path labels, policies. Default = true
    allowManagerToDel: true,
    // How much time to keep stats in the analytics statistics database. 7200 is two hours, 172800 is two days
    // It requires to re-index the analytics database whenever this is changed
    // Re-index for TTL can be done on the fly. Use the following example:
    // db.devicestats.getIndexes()
    // db.runCommand({collMod:'devicestats', index:{name: "createdAt_1",expireAfterSeconds:7200}})
    analyticsStatsKeepTime: 7200,
    // Time interval to keep data in the analytics statistics database
    // This value is for storing in the database, it's not impacting the interval presented in the UI
    analyticsUpdateTime: 300,
    // Do not allow organization LAN subnet overlaps for running devices flag. Default = true
    forbidLanSubnetOverlaps: true,
    // Expiration period in days for generated IKEv2 keys on the devices. Default = 360 days
    ikev2ExpireDays: 360,
    // Number of days before expiration to renew IKEv2 keys. Default = 30 days
    ikev2RenewBeforeExpireDays: 30,
    // IKEv2 phase 2 lifetime parameter in seconds.
    ikev2Lifetime: 3600,
    // IKEv2 phase 1 lifetime parameter in seconds
    ikev2LifetimePhase1: 28800,
    // IKEv2 PFS enabled or not
    ikev2Pfs: true,
    // Reconfig block time in seconds.
    reconfigErrorBlockTime: 60 * 60, // one hour
    // Public IP/Port block time in seconds.
    publicAddrBlockTime: 60 * 60, // one hour
    // Tunnel MTU in bytes. Now provisioned globally per server. Specify number to set specific MTU.
    // Use 0 to set the MTU based on the WAN interface MTU - tunnel header size
    globalTunnelMtu: 1500,
    // Default tunnel ospf cost, this value will be used if no value specified in the advanced tunnel config
    defaultTunnelOspfCost: 100,
    // TCP clamping header size, this value will be reduced from the MTU when calculating the mss clamping size
    tcpClampingHeaderSize: 40,
    // flexiVpn server portal url
    flexiVpnServer: ['https://localvpn.miwide.com:4443'], // can be string or list
    // After successful vpn client authentication, the OpenVPN server will generate tmp token valid for the below number of seconds.
    // On the following renegotiations, the OpenVPN client will pass this token instead of the users password
    vpnTmpTokenTime: 43200,
    // Ticketing system username
    ticketingSystemUsername: '',
    // Ticketing system token
    ticketingSystemToken: '',
    // Ticketing system url
    ticketingSystemUrl: '',
    // Ticketing system account ID to view
    ticketingSystemAccountId: '',
    // IP mask for tunnel Range
    tunnelRangeMask: '16',
    // Email alerts rate limit in minutes
    emailRateLimitPerDevice: 60,
    // Device disconnection time before triggering an alert in milliseconds (1 minute)
    deviceDisconnectionAlertTimeout: 60000,
    // Notification cool down period (3600000ms = 1 hour).
    // Aggregates similar event counts to minimize repetitive notifications within this time frame.
    notificationCoolDownPeriod: 3600000,
    /****************************************************/
    /*         Client Fields                            */
    /****************************************************/
    // Name of the company, is used in email templates
    companyName: 'flexiWAN',
    // URL that appears in contact us link in the UI,
    contactUsUrl: 'mailto:yourfriends@miwide.com',
    // Repository setup URL
    agentRepositoryUrl: 'https://deb.miwide.com/setup',
  // Captcha site (public) key exposed to client. Override with env CAPTCHA_SITE_KEY.
  // NOTE: Previously a hard-coded fallback key was shipped which could trigger
  // "Invalid domain for site key" errors in development when the domain was not
  // authorized for that key. We now default to an empty string so the widget
  // simply does not render unless the operator explicitly supplies a key.
  // For local development you may use Google's public TEST site key:
  //   6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI  (paired secret: 6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe)
  // Do NOT use the test pair in production – always register your own domain keys.
  captchaSiteKey: process.env.CAPTCHA_SITE_KEY || '',
    // HTML content of the UI about page
    aboutContent: '',
    // UI URL for feedback
    feedbackUrl: '',
    // If to show device limit alert banner
    showDeviceLimitAlert: false,
    // Whether to remove branding, e.g. powered by...
    removeBranding: false,
    // URL for account qualification
    qualifiedAccountsURL: 'https://www.miwide.com',
    // VPN portal URL
    vpnBaseUrl: ['https://localvpn.miwide.com:8000'],
    // Post registration redirect URL
    registerRedirectUrl: '',
    // GTM tag in the format of GTM-XXXXXXX
    gtmTag: '',
    // Config sent to client to save JWT token in SessionStorage (if true) or LocalStorage (if false)
    jwtInSessionStorage: false
  },
  // Override for development environment, default environment if not specified
  development: {
    // Updated to serve the new React UI (OpenSource-OpenNetworking) located at /frontend
    clientStaticDir: '../frontend/build',
    // Allowed servers for token creation (override restServerUrl list for token validation only)
    // Include local dev and custom manage.miwide.com domain.
    tokenAllowedServers: 'https://local.miwide.com:3443,http://local.miwide.com:3000,https://manage.miwide.com:3443,https://manage.miwide.com:443,https://manage.miwide.com:4443,https://manage.miwide.com,local.miwide.com:3443,manage.miwide.com:443,manage.miwide.com',
    mailerBypassCert: true,
    SwRepositoryUrl: 'https://deb.miwide.com/info/flexiwan-router/latest-testing',
    userTokenExpiration: 604800,
    logLevel: 'debug',
    mailerPort: 1025,
    // Enable HTTPS & redirect automatically in local development so no need for env vars each run
    shouldRedirectHttps: true,
    // Use relative (no leading slash) so path.join(__dirname,'bin',value) resolves correctly
    httpsCertKey: 'cert.local.miwide.com/domain.key',
    httpsCert: 'cert.local.miwide.com/certificate.pem'
  },
  testing: {
    // Mgmt-Agent protocol version for testing purposes
    agentApiVersion: '6.0.0',
    // Kue prefix
    kuePrefix: 'testq',
    logLevel: 'debug'
  },
  // Override for production environment
  production: {
    restServerUrl: ['https://app.miwide.com:443'],
    uiServerUrl: ['https://app.miwide.com:443'],
    shouldRedirectHttps: false,
    redirectHttpsPort: 443,
    agentBroker: ['app.miwide.com:443'],
    validateOpenAPIResponse: false,
  clientStaticDir: '../frontend/build',
    // 'billingConfigSite': 'flexiwan-test',
    // 'billingDefaultPlan': 'enterprise',
    // 'useFlexiBilling': true,
    logFilePath: '/var/log/flexiwan/flexiwan.log',
    reqLogFilePath: '/var/log/flexiwan/flexiwanReq.log',
    billingRedirectOkUrl: 'https://app.miwide.com/ok.html',
    logLevel: 'info',
    logUserName: true,
    corsWhiteList: ['https://app.miwide.com:443', 'http://app.miwide.com:80'],
    vpnBaseUrl: ['https://vpn.miwide.com']
  },
  hosted: {
    // modify next params for hosted server
    restServerUrl: ['https://hosted.server.com:443'],
    uiServerUrl: ['https://hosted.server.com:443'],
    agentBroker: ['hosted.server.com:443'],
    corsWhiteList: 'https://hosted.server.com:443, http://hosted.server.com:80',
    billingRedirectOkUrl: 'https://hosted.server.com/ok.html',
    shouldRedirectHttps: false,
    redirectHttpsPort: 443,
    validateOpenAPIResponse: false,
  clientStaticDir: '../frontend/build',
    billingConfigSite: 'flexiwan',
    billingDefaultPlan: 'enterprise',
    useFlexiBilling: true,
    logFilePath: '/var/log/flexiwan/flexiwan.log',
    reqLogFilePath: '/var/log/flexiwan/flexiwanReq.log',
    SwRepositoryUrl: 'https://deb.miwide.com/info/flexiwan-router/latest',
    logLevel: 'info',
    logUserName: true
  },
  // Override for manage environment for production
  manage: {
    restServerUrl: ['https://manage.miwide.com:443'],
    uiServerUrl: ['https://manage.miwide.com:443'],
    shouldRedirectHttps: false,
    redirectHttpsPort: 443,
    kuePrefix: 'mngdeviceq',
    agentBroker: ['manage.miwide.com:443'],
    validateOpenAPIResponse: false,
  clientStaticDir: '../frontend/build',
    logFilePath: '/var/log/flexiwan/flexiwan.log',
    reqLogFilePath: '/var/log/flexiwan/flexiwanReq.log',
    billingConfigSite: 'flexiwan',
    billingDefaultPlan: 'enterprise',
    useFlexiBilling: true,
    billingRedirectOkUrl: 'https://manage.miwide.com/ok.html',
    SwRepositoryUrl: 'https://deb.miwide.com/info/flexiwan-router/latest',
    logLevel: 'info',
    logUserName: true,
    corsWhiteList: ['https://manage.miwide.com:443', 'http://manage.miwide.com:80'],
    vpnBaseUrl: ['https://vpn.miwide.com']
  },
  // Override for appqa01 environment
  appqa01: {
    restServerUrl: ['https://appqa01.miwide.com:443'],
    uiServerUrl: ['https://appqa01.miwide.com:443'],
    shouldRedirectHttps: false,
    redirectHttpsPort: 443,
    userTokenExpiration: 300,
    userIpReqRateLimit: 3000,
    unreadNotificationPeriod: 300000,
    userRefreshTokenExpiration: 86400,
    agentBroker: ['appqa01.miwide.com:443'],
  clientStaticDir: '../frontend/build',
    logFilePath: '/var/log/flexiwan/flexiwan.log',
    reqLogFilePath: '/var/log/flexiwan/flexiwanReq.log',
    billingConfigSite: 'flexiwan-test',
    billingDefaultPlan: 'enterprise',
    useFlexiBilling: true,
    billingRedirectOkUrl: 'https://appqa01.miwide.com/ok.html',
    SwRepositoryUrl: 'https://deb.miwide.com/info/flexiwan-router/latest-testing',
    logLevel: 'debug',
    logUserName: true,
    corsWhiteList: ['https://appqa01.miwide.com:443', 'http://appqa01.miwide.com:80'],
    flexiVpnServer: 'https://vpnqa01.miwide.com:443', // can be string or list
    vpnBaseUrl: ['https://vpnqa01.miwide.com']
  },
  // Override for appqa02 environment
  appqa02: {
    restServerUrl: ['https://appqa02.miwide.com:443'],
    uiServerUrl: ['https://appqa02.miwide.com:443'],
    shouldRedirectHttps: false,
    redirectHttpsPort: 443,
    userTokenExpiration: 300,
    userIpReqRateLimit: 3000,
    unreadNotificationPeriod: 300000,
    userRefreshTokenExpiration: 86400,
    agentBroker: ['appqa02.miwide.com:443'],
  clientStaticDir: '../frontend/build',
    logFilePath: '/var/log/flexiwan/flexiwan.log',
    reqLogFilePath: '/var/log/flexiwan/flexiwanReq.log',
    billingConfigSite: 'flexiwan-test',
    billingDefaultPlan: 'enterprise',
    useFlexiBilling: true,
    billingRedirectOkUrl: 'https://appqa02.miwide.com/ok.html',
    SwRepositoryUrl: 'https://deb.miwide.com/info/flexiwan-router/latest-testing',
    logLevel: 'debug',
    logUserName: true,
    corsWhiteList: ['https://appqa02.miwide.com:443', 'http://appqa02.miwide.com:80'],
    flexiVpnServer: 'https://vpnqa02.miwide.com:443', // can be string or list
    vpnBaseUrl: ['https://vpnqa02.miwide.com']
  }
};

class Configs {
  constructor (env) {
    const environment = env || this.getEnv();
    console.log('environment=' + environment);
    const combinedConfig = { ...configEnv.default, ...configEnv[environment], environment: environment };

    // Allow to override any configuration value from environment
    Object.keys(combinedConfig).forEach(k => {
      // get upper case snake case variable
      const uSnakeCase = k.split(/(?=[A-Z])/).join('_').toUpperCase();

      // allow env variable to be empty string and override the combinedConfig
      if (process.env[uSnakeCase] !== undefined && process.env[uSnakeCase] !== null) {
        combinedConfig[k] = process.env[uSnakeCase];
      }
    });

    // Override with predefined special environment variables
    combinedConfig.userTokenSecretKey = process.env.USER_SECRET_KEY || combinedConfig.userTokenSecretKey;
    combinedConfig.deviceTokenSecretKey = process.env.DEVICE_SECRET_KEY || combinedConfig.deviceTokenSecretKey;
    combinedConfig.captchaKey = process.env.CAPTCHA_KEY || combinedConfig.captchaKey;
    combinedConfig.mongoUrl = process.env.MONGO_URL || combinedConfig.mongoUrl;
    combinedConfig.mongoBillingUrl = process.env.MONGO_BILLING_URL || combinedConfig.mongoBillingUrl;
    combinedConfig.mongoAnalyticsUrl = process.env.MONGO_ANALYTICS_URL || combinedConfig.mongoAnalyticsUrl;
    combinedConfig.mongoVpnUrl = process.env.MONGO_VPN_URL || combinedConfig.mongoVpnUrl;
    combinedConfig.billingApiKey = process.env.FLEXIBILLING_API_KEY || combinedConfig.billingApiKey;
    combinedConfig.redisUrl = process.env.REDIS_URL || combinedConfig.redisUrl;
    combinedConfig.webHookAddUserUrl = process.env.WEBHOOK_ADD_USER_URL || combinedConfig.webHookAddUserUrl;
    combinedConfig.webHookAddUserSecret = process.env.WEBHOOK_ADD_USER_KEY || combinedConfig.webHookAddUserSecret;
    combinedConfig.webHookRegisterDeviceUrl = process.env.WEBHOOK_REGISTER_DEVICE_URL ||
      combinedConfig.webHookRegisterDeviceUrl;
    combinedConfig.webHookRegisterDeviceSecret = process.env.WEBHOOK_REGISTER_DEVICE_KEY ||
      combinedConfig.webHookRegisterDeviceSecret;

    /****************************************************/
    /*           Applications URL workaround            */
    /****************************************************/
    // Currently and temporarily we take the "Template" folder from the "SwVersionUpdateUrl".
    // In the future we will have "APPLICATIONS_URL" ENV for applications url.
    if (process.env.APPLICATIONS_URL) {
      combinedConfig.applicationsUrl = process.env.APPLICATIONS_URL;
    } else {
      const regex = /Templates.*\//g;
      const templateDirName = combinedConfig.SwVersionUpdateUrl.match(regex)[0];
      combinedConfig.applicationsUrl = combinedConfig.applicationsUrl.replace('Templates/', templateDirName);
    }

    this.config_values = combinedConfig;

    this.config_values.nodeVersion = process.version;

    console.log('Configuration used:\n' + JSON.stringify(this.config_values, null, 2));
  }

  getEnv () {
    if (process.argv[1].indexOf('jest') !== -1) return 'testing';
    return process.argv[2] || 'development';
  }

  // Get the config parameter and convert it from string to the desired type
  // If the value is not string, its value is returned with no conversion
  get (key, type = 'string') {
    if (typeof this.config_values[key] === 'string') {
      try {
        switch (type) {
          case 'string':
            return this.config_values[key];
          case 'number':
            return +this.config_values[key];
          case 'list':
            return this.config_values[key].split(/,\s*/);
          case 'boolean':
            if (this.config_values[key].toLowerCase() === 'true') return true;
            else if (this.config_values[key].toLowerCase() === 'false') return false;
            else throw new Error('Not a boolean value');
        }
      } catch (err) {
        // the configs module is used by logger, so just console error
        console.error('Could not convert config param', {
          params: { key: key, value: this.config_values[key], message: err.message }
        });
      }
    }
    return this.config_values[key];
  }

  getAll () {
    return this.config_values;
  }

  // The info returned by this function will be shared with the client
  // Add fields that needs to be known by the client
  // Pay attention not to expose confidential fields
  // When adding a new variable add also in client/public/index.html
  getClientConfig (req) {
    const servers = this.get('restServerUrl', 'list');
    const vpnServers = this.get('vpnBaseUrl', 'list');

    let baseUrl = servers[0];
    let vpnBaseUrl = vpnServers[0];

    if (req.hostname) {
      const usedServer = servers.findIndex(s => s.includes(req.hostname));
      if (usedServer > -1) {
        baseUrl = servers[usedServer];
        if (vpnServers[usedServer]) {
          vpnBaseUrl = vpnServers[usedServer];
        }
      }
    }

    return {
      baseUrl: baseUrl + '/api/',
      companyName: this.get('companyName'),
      allowUsersRegistration: this.get('allowUsersRegistration', 'boolean'),
      contactUsUrl: this.get('contactUsUrl'),
      agentRepositoryUrl: this.get('agentRepositoryUrl'),
      captchaSiteKey: this.get('captchaSiteKey'),
      aboutContent: this.get('aboutContent'),
      feedbackUrl: this.get('feedbackUrl'),
      showDeviceLimitAlert: this.get('showDeviceLimitAlert', 'boolean'),
      removeBranding: this.get('removeBranding', 'boolean'),
      qualifiedAccountsURL: this.get('qualifiedAccountsURL'),
      vpnBaseUrl: vpnBaseUrl + '/',
      registerRedirectUrl: this.get('registerRedirectUrl'),
      gtmTag: this.get('gtmTag'),
      jwtInSessionStorage: this.get('jwtInSessionStorage', 'boolean')
    };
  }
}

var configs = null;
module.exports = function (env = null) {
  if (configs) return configs;
  else {
    configs = new Configs(env);
    return configs;
  }
};
