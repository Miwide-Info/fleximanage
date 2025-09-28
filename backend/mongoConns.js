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

const configs = require('./configs')();
const mongoose = require('mongoose');
const logger = require('./logging/logging')({ module: module.filename, type: 'mongodb' });

class MongoConns {
  constructor () {
    this.getMainDB = this.getMainDB.bind(this);
    this.getAnalyticsDB = this.getAnalyticsDB.bind(this);

  // Connection tuning rationale:
  // 1. Raise serverSelectionTimeoutMS to 15000 to reduce noisy "Server selection timed out after 5000 ms"
  //    warnings when the replica set is just starting and electing a PRIMARY.
  // 2. Add a larger connectTimeoutMS as an upper bound for establishing TCP connections so we do not
  //    block for a long time under certain network conditions.
  // 3. Force IPv4 to avoid extra retries due to ::1 / DNS resolution differences.
    const commonConnOptions = {
      useNewUrlParser: true,
      useCreateIndex: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000,
      // Increase connectTimeoutMS to avoid premature "connection timed out" logs when TCP handshakes are slow during cold start
      connectTimeoutMS: 15000,
      family: 4 // Force IPv4
    };

    // Initial connection grace period: right after the replica set starts it may take a few seconds to elect a PRIMARY.
    // During the grace window the first failures are logged as warn (to reduce noise); after the grace window we escalate to error.
    const INITIAL_CONNECT_GRACE_MS = parseInt(process.env.MONGO_INITIAL_GRACE_MS || '20000', 10);
    const startTs = Date.now();
    const firstFailure = { mainDB: false, analyticsDB: false, vpnDB: false };

    const mainUri = configs.get('mongoUrl');
    this.mainDB = mongoose.createConnection(mainUri, commonConnOptions);
    this._attachConnEvents(this.mainDB, 'mainDB', mainUri);
    this.mainDB.catch(err => {
      const withinGrace = (Date.now() - startTs) < INITIAL_CONNECT_GRACE_MS;
      if (!firstFailure.mainDB) {
        firstFailure.mainDB = true;
        logger.warn('Initial mainDB connect failed (first failure, will retry)', { params: { err: err.message } });
      } else {
        const logFn = withinGrace ? logger.warn : logger.error;
        logFn(`Initial mainDB connect failed${withinGrace ? ' (grace period, likely election)' : ''}`, { params: { err: err.message } });
      }
      this._retryOpen(this.mainDB, mainUri, 'mainDB');
    });

    const analyticsUri = configs.get('mongoAnalyticsUrl');
    this.analyticsDB = mongoose.createConnection(analyticsUri, commonConnOptions);
    this._attachConnEvents(this.analyticsDB, 'analyticsDB', analyticsUri);
    this.analyticsDB.catch(err => {
      const withinGrace = (Date.now() - startTs) < INITIAL_CONNECT_GRACE_MS;
      if (!firstFailure.analyticsDB) {
        firstFailure.analyticsDB = true;
        logger.warn('Initial analyticsDB connect failed (first failure, will retry)', { params: { err: err.message } });
      } else {
        const logFn = withinGrace ? logger.warn : logger.error;
        logFn(`Initial analyticsDB connect failed${withinGrace ? ' (grace period, likely election)' : ''}`, { params: { err: err.message } });
      }
      this._retryOpen(this.analyticsDB, analyticsUri, 'analyticsDB');
    });

    const vpnUri = configs.get('mongoVpnUrl');
    this.vpnDB = mongoose.createConnection(vpnUri, commonConnOptions);
    this._attachConnEvents(this.vpnDB, 'vpnDB', vpnUri);
    this.vpnDB.catch(err => {
      const withinGrace = (Date.now() - startTs) < INITIAL_CONNECT_GRACE_MS;
      if (!firstFailure.vpnDB) {
        firstFailure.vpnDB = true;
        logger.warn('Initial vpnDB connect failed (first failure, will retry)', { params: { err: err.message } });
      } else {
        const logFn = withinGrace ? logger.warn : logger.error;
        logFn(`Initial vpnDB connect failed${withinGrace ? ' (grace period, likely election)' : ''}`, { params: { err: err.message } });
      }
      this._retryOpen(this.vpnDB, vpnUri, 'vpnDB');
    });
  }

  _attachConnEvents (conn, name, uri) {
    conn.on('connected', () => logger.info(`Connected to MongoDB ${name}`, { params: { uri: this._redact(uri) } }));
    conn.on('error', err => logger.error(`MongoDB ${name} error`, { params: { err: err.message } }));
    conn.on('disconnected', () => logger.warn(`MongoDB ${name} disconnected`));
    conn.on('reconnected', () => logger.info(`MongoDB ${name} reconnected`));
  }

  _retryOpen (conn, uri, name, attempt = 1) {
    const maxAttempts = 5;
    const delay = Math.min(5000, 500 * attempt);
    if (attempt > maxAttempts) {
      logger.error(`MongoDB ${name} giving up after ${maxAttempts} attempts`);
      return;
    }
    setTimeout(() => {
      logger.info(`Retrying MongoDB ${name} connection (attempt ${attempt})`);
      conn.openUri(uri).catch(() => this._retryOpen(conn, uri, name, attempt + 1));
    }, delay);
  }

  _redact (uri) {
    return uri.replace(/:\/\/(.*)@/, '://***:***@');
  }

  getMainDB () {
    return this.mainDB;
  }

  /**
   * Run session based operation with the main database
   * @async
   * @param  {Function} func          Async function to be called as part of the transaction,
   *                                  this function get the session as a parameter
   * @param  {Boolean}  closeSession  Whether to end the session when the transaction completed
   *                                  or allow to the caller to close the session
   *                                  This is needed if some transaction objects are still used
   *                                  after the transaction completed
   * @param  {Number}   times         How many times to try in case of WriteConflict Mongo error
   * @return {Object}   session used  The session used, if closeSession is false, the session will
   *                                  be provided to the caller to close the session
   */
  async mainDBwithTransaction (func, closeSession = true, times = 3) {
    let execNum = 0;
    let session;
    try {
      session = await this.mainDB.startSession();
      await session.withTransaction(async () => {
        // By default, "withTransaction" tries the function infinitely if the error is mongo error.
        // It tries the function until it succeeds.
        // Hance we have a protection to prevent infinite loop.
        // If more than 'times' transient errors (writeConflict), exit with non-mongo error
        execNum += 1;
        if (execNum > times) {
          throw new Error(`Error writing to database, too many attempts (${times})`);
        }

        try {
          await func(session);
        } catch (err) {
          // print error to log and throw it back.
          // As written above, the "withTransaction" will try the function again.
          logger.error('Transaction failed', { params: { err: err.message } });
          // throw the same error we get.
          // If it is a mongo error, the "withTransaction" will try again up to "times".
          // If it is not a mongo error, the "withTransaction" will abort the session and exit.
          throw err;
        }
      });
    } finally {
      // This creates an issue with some updates, need to understand why
      if (closeSession && session) session.endSession();
    }
    return session;
  }

  getAnalyticsDB () {
    return this.analyticsDB;
  }

  getVpnDB () {
    return this.vpnDB;
  }
}

var mongoConns = null;
module.exports = function () {
  if (mongoConns) return mongoConns;
  else {
    mongoConns = new MongoConns();
    return mongoConns;
  }
};
