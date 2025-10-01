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

const express = require('express');
const bodyParser = require('body-parser');
const tokens = require('../models/tokens');
const wrapper = require('./wrapper');
var jwt = require('jsonwebtoken');
var configs = require('../configs.js')();
const tokensRouter = express.Router();
tokensRouter.use(bodyParser.json());

// Error formatter
const formatErr = (err, msg) => {
  // Check for unique error
  if (err.name === 'MongoError' && err.code === 11000) {
    return ({ status: 500, error: 'Token ' + msg.name + ' already exists' });
  } else if (err.message) {
    return ({ status: 500, error: err.message });
  } else {
    return ({ status: 500, error: 'Unable to format error' });
  }
};

// Generate token
const genToken = function (data) {
  return jwt.sign(data, configs.get('deviceTokenSecretKey'));
};

// check update
const checkUpdReq = (qtype, req) => new Promise(function (resolve, reject) {
  if (qtype === 'POST') {
    req.body.token = genToken({
      org: req.user.defaultOrg._id.toString(),
      account: req.user.defaultAccount._id
    });
    req.body.org = req.user.defaultOrg._id.toString();
  } else {
    // Don't allow to update the token
    delete req.body.token;
  }
  if (qtype === 'PUT') {
    // Don't allow to update the unchangeable fields
    delete req.body.token;
    delete req.body.org;
  }
  resolve({ ok: 1 });
});

// Add a cache-busting endpoint to force fresh data
tokensRouter.get('/fresh', async (req, res) => {
  try {
    // Add aggressive no-cache headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': `"fresh-${Date.now()}"`,
      'Last-Modified': new Date().toUTCString(),
      'Vary': '*'
    });

    // Get tokens with JWT decoding
    const tokensData = await tokens.find({ org: req.user.defaultOrg._id });
    
    const tokensWithServer = tokensData.map(item => {
      let server = '-';
      try {
        const decoded = jwt.decode(item.token);
        server = decoded?.server || '-';
      } catch (err) {
        server = '-';
      }
      
      return {
        _id: item._id,
        org: item.org.toString(),
        name: item.name,
        token: item.token,
        server: server,
        createdAt: item.createdAt.toISOString(),
        _fresh: Date.now()
      };
    });

    res.json(tokensWithServer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Custom response processor to add server field from JWT
const processTokensResponse = (qtype, req, res, next, resp) => {
  console.log('🔥 CUSTOM PROCESSOR CALLED! qtype:', qtype, 'resp type:', typeof resp);
  return new Promise((resolve, reject) => {
    try {
      console.log(`DEBUG WRAPPER: Processing ${qtype} request, response type:`, typeof resp, 'length:', Array.isArray(resp) ? resp.length : 'not array');
      
      if (qtype === 'GET' && Array.isArray(resp)) {
        console.log(`DEBUG WRAPPER: Processing ${resp.length} tokens`);
        // Add server field by decoding JWT tokens
        resp.forEach((token, index) => {
          if (token.token) {
            try {
              const decoded = jwt.decode(token.token);
              const serverValue = decoded?.server || '-';
              token.server = serverValue;
              console.log(`DEBUG WRAPPER: Token ${index + 1} (${token.name}): server = ${serverValue}`);
            } catch (err) {
              token.server = '-';
              console.log(`DEBUG WRAPPER: Token ${index + 1} (${token.name}): JWT decode error:`, err.message);
            }
          } else {
            console.log(`DEBUG WRAPPER: Token ${index + 1} (${token.name}): No token field`);
          }
        });
        console.log('DEBUG WRAPPER: Final response sample:', JSON.stringify(resp[0], null, 2));
      }
      resolve(resp);
    } catch (error) {
      console.log('DEBUG WRAPPER: Error in processTokensResponse:', error.message);
      reject(error);
    }
  });
};

console.log('🚀 TOKENS ROUTE LOADED WITH CUSTOM PROCESSOR');

// wrapper
wrapper.assignRoutes(tokensRouter, 'tokens', '/', tokens, formatErr, checkUpdReq, processTokensResponse);
wrapper.assignRoutes(tokensRouter, 'tokens', '/:tokenId', tokens, formatErr, checkUpdReq, processTokensResponse);

// Default exports
module.exports = tokensRouter;
