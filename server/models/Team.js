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
        enum: ['General', 'Technical', 'Billing', 'HR', 'Other'],
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
    teamAdminPassword: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Team', teamSchema);
