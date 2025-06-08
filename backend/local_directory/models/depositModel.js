const mongoose = require("mongoose");

const depositSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  address: { type: String, required: true },
  network: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  }, // e.g., 'pending', 'completed'
  transactionId: { type: String },
  createdAt: { type: Date, default: Date.now },
  remarks:{type:String},
});

const Deposit = mongoose.model("Deposit", depositSchema);

module.exports = Deposit;
