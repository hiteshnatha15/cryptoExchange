const Admin = require("../models/adminModel");
const mongoose = require("mongoose");
const Deposit = require("../models/depositModel");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const Sell = require("../models/sellModel");
const Price = require("../models/priceModel");
require("dotenv").config();

exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(400).json({ message: "Invalid username or password" });
    }
    if (admin.password !== password) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllSells = async (req, res) => {
  try {
    const sells = await Sell.find();
    res.status(200).json({ sells });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getUserDetailsUsingAdmin = async (req, res) => {
  try {
    const { userId } = req.body;
    console.log("userId", userId);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.approveSell = async (req, res) => {
  const { id, utrNo } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid sell ID" });
  }
  try {
    const sell = await Sell.findById(id);
    if (!sell) {
      return res.status(404).json({ message: "Sell not found" });
    }
    if (sell.status === "approved") {
      return res.status(400).json({ message: "Sell already approved" });
    }
    sell.utrNo = utrNo;
    sell.status = "approved";
    await sell.save();
    const user = await User.findById(sell.userId);
    user.balances.processing -= sell.usdtAmount;
    await user.save();
    res.status(200).json({ message: "Sell approved successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.rejectSell = async (req, res) => {
  const { id } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid sell ID" });
  }
  try {
    const sell = await Sell.findById(id);
    if (!sell) {
      return res.status(404).json({ message: "Sell not found" });
    }
    if (sell.status === "rejected") {
      return res.status(400).json({ message: "Sell already rejected" });
    }
    sell.status = "failed";
    await sell.save();
    const user = await User.findById(sell.userId);
    user.balances.processing -= sell.usdtAmount;
    await user.save();
    res.status(200).json({ message: "Sell rejected successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllDeposits = async (req, res) => {
  try {
    const deposits = await Deposit.find();
    res.status(200).json({ deposits });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.rejectDeposit = async (req, res) => {
  const { id } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid deposit ID" });
  }
  try {
    const deposit = await Deposit.findById(id);
    console.log("deposit", deposit); // Moved console.log here to ensure it only runs if deposit is found
    if (!deposit) {
      return res.status(404).json({ message: "Deposit not found" });
    }
    if (deposit.status === "failed") {
      return res.status(400).json({ message: "Deposit already rejected" });
    }
    deposit.status = "failed";
    await deposit.save();
    const user = await User.findById(deposit.userId);
    const network = "BSC" ? "bep20" : "trc20";
    user.balances[network] -= deposit.usdtAmount;
    await user.save();
    res.status(200).json({ message: "Deposit rejected successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.updatePrice = async (req, res) => {
  const { usdtPrice } = req.body;
  try {
    const price = await Price.findOne();
    if (!price) {
      return res.status(404).json({ message: "Price not found" });
    }
    price.usdtPrice = usdtPrice;
    await price.save();
    res.status(200).json({ message: "Price updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllUserDetailsUsingAdmin = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateUserBalance = async (req, res) => {
  try {
    const { userId, bep20, trc20, processing, commission } = req.body;
    console.log(userId);

    // Check if the userId is provided
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" ,success:false});
    }

    // Find the user by userId
    const user = await User.findById(userId);
    console.log("user");
    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" ,success:false});
    }
    // Update the user's balances
    user.balances.bep20 = bep20 !== undefined ? bep20 : user.balances.bep20;
    user.balances.trc20 = trc20 !== undefined ? trc20 : user.balances.trc20;
    user.balances.processing = processing !== undefined ? processing : user.balances.processing;
    user.balances.commission = commission !== undefined ? commission : user.balances.commission;

    // Save the updated user
    await user.save();
    console.log(user);
    // Send success response
    res.status(200).json({
      message: "User balance updated successfully",
      updatedBalances: user.balances,
      success:true
    });
  } catch (error) {
    console.error("Error updating user balance:", error);
    res.status(500).json({ message: "Internal server error" ,
      success:false,
    });
  }
};
