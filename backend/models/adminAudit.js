// Admin audit log model
// Records privileged actions like promoting/demoting admins and manual verifications

const mongoose = require('mongoose');
const mongoConns = require('../mongoConns.js')();

const AdminAuditSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'PROMOTE_ADMIN',
      'DEMOTE_ADMIN',
      'VERIFY_USER',
      'BATCH_PROMOTE_ADMIN',
      'BATCH_DEMOTE_ADMIN',
      'BATCH_VERIFY_USER'
    ]
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  byUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  meta: {
    type: Object,
    required: false,
    default: {}
  }
}, { timestamps: true });

AdminAuditSchema.index({ createdAt: -1 });

module.exports = mongoConns.getMainDB().model('admin_audit', AdminAuditSchema);
