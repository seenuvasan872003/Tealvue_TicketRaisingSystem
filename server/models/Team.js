const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    categories: [
      {
        type: String,
      },
    ],
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    teamAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Team Admin is required'],
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // ── Feedback Performance ─────────────────────────────
    averageRating:  { type: Number, default: null },
    totalFeedbacks: { type: Number, default: 0 },
    ratingBreakdown: {
      one:   { type: Number, default: 0 },
      two:   { type: Number, default: 0 },
      three: { type: Number, default: 0 },
      four:  { type: Number, default: 0 },
      five:  { type: Number, default: 0 }
    },

    teamAdminPassword: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Team', teamSchema);
