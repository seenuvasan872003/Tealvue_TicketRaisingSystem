// ============================================================
//  server/models/RoleFeature.js  —  Per-User Feature Assignments
// ============================================================
//  One document per user. Stores which features are enabled.
//  Created automatically when a user account is created.
// ============================================================

const mongoose = require('mongoose');

const roleFeatureSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ['super-admin', 'admin', 'user', 'team_admin', 'team_user'],
      required: true,
    },
    features: [{ type: String }],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RoleFeature', roleFeatureSchema);
