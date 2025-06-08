const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  mobile: { type: String, required: true, unique: true },
  bankDetails: {
    accountNumber: { type: String },
    ifscCode: { type: String },
    accountHolderName: { type: String },
    upiId:{type:String}
  },
  otp: { type: String }, // Field to store OTP for verification
  otpExpiry: { type: Date }, // Field to store OTP expiry time
  createdAt: { type: Date, default: Date.now },
  balances: {
    bep20: { type: Number, default: 0 }, // Default balance for BEP-20
    trc20: { type: Number, default: 0 }, // Default balance for TRC-20
    processing: { type: Number, default: 0 }, // Default processing balance
    commission: { type: Number, default: 0 }, // Field to store total commission earned
  },
  walletAddress: {
    bep20: { type: String, unique: true, sparse: true }, // Ensure unique wallet addresses
    trc20: { type: String, unique: true, sparse: true },
  },
  transactionPassword: { type: String },
  referralCode: { type: String, unique: true }, // Unique referral code
  referredBy: { type: String }, // Track who referred this user
  referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Store referred users
  status: {
    type: String,
    enum: ["active", "pending", "blocked"],
    default: "active",
  },
});

// Automatically generate referral code if not present
userSchema.pre("save", function (next) {
  if (!this.referralCode) {
    this.referralCode = `REF${this._id.toString().slice(-6)}`;
  }
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
