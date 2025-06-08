const Otp = require("../models/otpModel");
const User = require("../models/userModel");
const generateOtp = require("../utils/generateOtp");
const otpService = require("../services/otpService");
const jwt = require("jsonwebtoken");

const otpController = {
  sendOtp: async (req, res) => {
    let { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    // Format mobile number for consistency
    mobile = `+91${mobile}`;
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

    // Check if OTP entry exists for this mobile number
    let otpEntry = await Otp.findOne({ mobile });
    if (!otpEntry) {
      // Create a new OTP entry if it doesn't exist
      otpEntry = new Otp({
        mobile,
        otp,
        otpExpiry,
      });
    } else {
      // Update existing OTP and expiry
      otpEntry.otp = otp;
      otpEntry.otpExpiry = otpExpiry;
    }
    await otpEntry.save(); // Save OTP entry

    // Send OTP using the otpService
    const sent = await otpService.sendOtp(mobile, otp);
    if (sent) {
      res.status(200).json({ message: "OTP sent successfully" });
    } else {
      res.status(500).json({ message: "Failed to send OTP" });
    }
  },

  verifyOtp: async (req, res) => {
    let { mobile, otp, referralCode } = req.body;

    if (!mobile || !otp) {
      return res
        .status(400)
        .json({ message: "Mobile number and OTP are required" });
    }

    // Format mobile number
    mobile = `+91${mobile}`;
    const otpEntry = await Otp.findOne({ mobile });

    if (!otpEntry) {
      return res.status(400).json({ message: "OTP not found" });
    }

    // Verify OTP and check expiry
    if (otpEntry.otp === otp && otpEntry.otpExpiry > new Date()) {
      // OTP is valid, create or update the user
      let user = await User.findOne({ mobile });

      if (!user) {
        // Check if referral code is valid
        let referredBy = null;
        if (referralCode) {
          const referrer = await User.findOne({ referralCode });
          if (referrer) {
            referredBy = referralCode; // Valid referral code, assign it to the new user
          } else {
            return res.status(400).json({ message: "Invalid referral code" });
          }
        }

        // Create new user and associate the referrer
        user = new User({
          mobile,
          balances: { bep20: 0, trc20: 0 }, // Default balances
          referredBy, // Store referral code of the referrer if provided
        });
        await user.save();

        // If referred, update referrer's `referrals` list
        if (referredBy) {
          await User.findOneAndUpdate(
            { referralCode: referredBy },
            { $push: { referrals: user._id } }
          );
        }
      }
      console.log(user);
      // Generate a JWT token for the user
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "24h",
      });

      // Clear OTP entry after successful verification
      await Otp.deleteOne({ mobile });

      return res.status(200).json({
        message: "OTP verified successfully",
        token,
        balances: user.balances,
      });
    } else {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
  },
};

module.exports = otpController;
