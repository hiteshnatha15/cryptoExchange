const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  depositId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Deposit",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  commissionAmount: {  // New field for commission amount
    type: Number,
    required: true,
  },
  referredUserId: {  // New field for referred user ID
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  referrerId: {  // New field for referrer ID
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Commission = mongoose.model("Commission", commissionSchema);

module.exports = Commission;
