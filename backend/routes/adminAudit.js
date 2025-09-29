// Admin audit retrieval route
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const auth = require('../authenticate');
const createError = require('http-errors');
const AdminAudit = require('../models/adminAudit');

const router = express.Router();
router.use(bodyParser.json());

// GET /users/admin/audit mounted under /api/users/admin/audit in expressserver
router.route('/')
  .get(cors.corsWithOptions, auth.verifyUserJWT, async (req, res, next) => {
    try {
      if (!req.user || req.user.admin !== true) {
        return next(createError(403, 'Only super admin can view admin audit log'));
      }
      const offset = parseInt(req.query.offset || '0', 10);
      const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
      const action = req.query.action;
      const target = req.query.target;
      const filter = {};
      if (action) filter.action = action;
      if (target) filter.targetUser = target;
      const [total, items] = await Promise.all([
        AdminAudit.countDocuments(filter),
        AdminAudit.find(filter)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
      ]);
      return res.status(200).json({
        total,
        items: items.map(doc => ({
          id: doc._id.toString(),
          action: doc.action,
          targetUser: doc.targetUser.toString(),
          byUser: doc.byUser.toString(),
          createdAt: doc.createdAt
        }))
      });
    } catch (err) {
      return next(createError(500, err.message));
    }
  });

module.exports = router;
