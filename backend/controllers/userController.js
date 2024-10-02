const User = require("../models/userModel"); // Adjust the path as necessary
const Deposit = require("../models/depositModel"); // Adjust the path as necessary
const Sell = require("../models/sellModel"); // Adjust the path as necessary
const otpService = require("../services/otpService");
const generateOtp = require("../utils/generateOtp");
const Price = require("../models/priceModel");
// Check if bank details are saved
exports.getUserDetails = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming you're using req.user from your authentication middleware
    const user = await User.findById(userId);

    if (user) {
      return res.json({
        userDetails: user,
        success: true,
      });
    } else {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res.status(500).json({ message: "Server error", success: false });
  }
};
exports.checkBankDetails = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming you're using req.user from your authentication middleware
    const user = await User.findById(userId);

    if (user && user.bankDetails && user.bankDetails.accountNumber) {
      console.log("Bank details found:", user.bankDetails);
      return res.json({
        bankDetailsSaved: true,
        bankDetails: user.bankDetails,
      });
    } else {
      return res.json({ bankDetailsSaved: false });
    }
  } catch (error) {
    console.error("Error checking bank details:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Add bank account
exports.addBankAccount = async (req, res) => {
  const { bankDetails } = req.body;
  const userId = req.user.id; // Assuming you have the user ID from the token

  try {
    // Find the user and update their bank details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update or set bank details
    user.bankDetails = bankDetails; // This will replace the existing details
    await user.save();

    res.status(200).json({
      message: "Bank details updated successfully",
      bankDetails: user.bankDetails,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getDeposits = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming you're using req.user from your authentication middleware
    const deposits = await Deposit.find({ userId });

    if (deposits.length > 0) {
      console.log("Deposits found:", deposits);
      return res.json({
        deposits,
        success: true,
      });
    } else {
      return res
        .status(404)
        .json({ message: "No deposits found", success: false });
    }
  } catch (error) {
    console.error("Error fetching deposit details:", error);
    return res.status(500).json({ message: "Server error", success: false });
  }
};
exports.getSells = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming you're using req.user from your authentication middleware
    const sell = await Sell.find({ userId });

    if (sell.length > 0) {
      console.log("Sell found:", sell);
      return res.json({
        sell,
        success: true,
      });
    } else {
      return res.status(404).json({ message: "No Sell found", success: false });
    }
  } catch (error) {
    console.error("Error fetching Sell details:", error);
    return res.status(500).json({ message: "Server error", success: false });
  }
};

exports.addWalletAddress = async (req, res) => {
  const { walletAddress, network } = req.body;
  const userId = req.user.id; // Assuming you have the user ID from the token

  try {
    // Find the user and update their wallet address
    if (!walletAddress || !network) {
      return res.status(400).json({ message: "Wallet address is required" });
    }
    if (!["bep20", "trc20"].includes(network)) {
      return res.status(400).json({
        message:
          "Invalid network. Only 'BSC' (BEP-20) and 'TRX' (TRC-20) are allowed.",
      });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Update or add the wallet address for the specified network
    if (!user.walletAddress) {
      user.balances.walletAddress = {};
    }
    user.walletAddress[network] = walletAddress;
    const result = await user.save();
    console.log("result", result);
    res.status(200).json({
      message: "Wallet address updated successfully",
      walletAddresses: user.balances.walletAddress,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// Request to send OTP for transaction password reset
const mongoose = require("mongoose"); // Make sure Mongoose is imported

exports.requestResetTransactionPassword = async (req, res) => {
  try {
    // Generate OTP
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    const userId = req.user.id; // Assuming you have the user ID from the token

    // Validate userId
    if (!mongoose.isValidObjectId(userId)) {
      return res
        .status(400)
        .json({ message: "Invalid user ID", success: false });
    }

    console.log("userId", userId);

    // Use findById to find user
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    const mobile = user.mobile;
    if (!mobile) {
      return res
        .status(400)
        .json({ message: "Mobile number is required", success: false });
    }

    // Set OTP and expiry
    user.otp = otp;
    user.otpExpiry = otpExpiry;

    // Save user
    await user.save();

    // Send OTP via SMS
    const sent = await otpService.sendOtp(mobile, otp);
    if (sent) {
      return res
        .status(200)
        .json({ message: "OTP sent successfully", success: true });
    } else {
      return res
        .status(500)
        .json({ message: "Failed to send OTP", success: false });
    }
  } catch (error) {
    console.error("Error requesting OTP:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.resetTransactionPassword = async (req, res) => {
  const { transactionPassword, otp } = req.body;
  const userId = req.user.id; // Assuming you have the user ID from the token

  // Validate transaction password
  if (!/^\d{6}$/.test(transactionPassword)) {
    return res.status(400).json({
      message: "Transaction password must be a 6-digit number",
      success: false,
    });
  }

  try {
    // Find the user by mobile number
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    // Check OTP
    if (user.otp !== otp || user.otpExpiry < new Date()) {
      return res
        .status(400)
        .json({ message: "Invalid or expired OTP", success: false });
    }

    // Update transaction password and clear OTP
    user.transactionPassword = transactionPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    return res.status(200).json({
      message: "Transaction password updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error resetting transaction password:", error);
    return res
      .status(500)
      .json({ message: "Server error", error, success: false });
  }
};

exports.getUsdtPrice = async (req, res) => {
  try {
    const price = await Price.findOne(); // Fetch the single price document
    if (price) {
      console.log("Price found:", price);
      return res.json({
        price,
        success: true,
      });
    } else {
      return res
        .status(404)
        .json({ message: "No price found", success: false });
    }
  } catch (error) {
    console.error("Error fetching price details:", error);
    return res.status(500).json({ message: "Server error", success: false });
  }
};
