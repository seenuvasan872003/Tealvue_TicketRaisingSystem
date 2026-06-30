const mongoose = require('mongoose');

const clientLogSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      required: true,
      enum: ['info', 'warn', 'error'],
    },
    timestamp: {
      type: String,
      required: true,
    },
    file: {
      type: String,
      required: true,
    },
    component: {
      type: String,
      required: true,
    },
    function: {
      type: String,
      required: true,
    },
    api: {
      type: String,
      default: '—',
    },
    method: {
      type: String,
      default: '—',
    },
    status: {
      type: String,
      default: '—',
    },
    message: {
      type: String,
      required: true,
    },
    stack: {
      type: String,
      default: '—',
    },
    route: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      default: '—',
    },
    // Optional: reference to the user if session exists
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClientLog', clientLogSchema);
