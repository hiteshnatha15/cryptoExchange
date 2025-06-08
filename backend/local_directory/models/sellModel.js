const mongoose = require("mongoose");

const sellModel = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  usdtAmount: { type: Number, required: true }, // New field for USDT amount
  rupeeAmount: { type: Number, required: true }, // New field for Rupee amount
  network: { type: String, required: true },
  bankDetails: {
    accountNumber: { type: String },
    ifscCode: { type: String },
    accountHolderName: { type: String },
    upiId:{type:String}
  },
  status: {
    type: String,
    enum: ["pending", "approved", "failed"],
    default: "pending",
  }, // e.g., 'pending', 'completed'
  transactionId: { type: String },
  utrNo: { type: String },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

const Sell = mongoose.model("Sell", sellModel);
module.exports = Sell;
