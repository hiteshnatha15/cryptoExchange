const express = require("express");
const router = express.Router();
const { auth, verifyUser } = require("../middlewares/auth");
const { adminAuth } = require("../middlewares/adminAuth");
const { verifyAdmin } = require("../middlewares/adminAuth");
const referralCommissionController = require('../controllers/referralCommissionController')

const {
  adminLogin,
  getAllSells,
  getUserDetailsUsingAdmin,
  approveSell,
  rejectSell,
  getAllDeposits,
  rejectDeposit,
  updatePrice,
  getAllUserDetailsUsingAdmin,
  updateUserBalance
} = require("../controllers/adminController");

// Importing controllers
const {
  generateDepositAddress,
  submitTransactionId,
  processWithdrawal,
  deleteTransaction,
  sellCrypto,
  addOrUpdateDepositAddress,
  getDepositAddressManual,
  submitTransactionIdManual,
  approveTransactionManual,
  markDepositFailed,
} = require("../controllers/binanceController");

const { sendOtp, verifyOtp } = require("../controllers/otpController");
const {
  checkBankDetails,
  addBankAccount,
  getUserDetails,
  getDeposits,
  getSells,
  addWalletAddress,
  resetTransactionPassword,
  requestResetTransactionPassword,
  getUsdtPrice,
  checkRegistration,
  deleteUser,
  deleteTransactions,
  getReferralCode
} = require("../controllers/userController"); // Import your new controller

// Deposit and Withdrawal Routes (Protected routes, require authentication)
router.get("/api/authUser", verifyUser);
router.get("/api/verifyAdmin", verifyAdmin);

router.post(
  "/api/deposit/generate-deposit-address",
  auth,
  getDepositAddressManual
);
router.post('/api/setAddressManually',adminAuth,addOrUpdateDepositAddress);
router.post('/api/approveDeposit',adminAuth,approveTransactionManual);
router.post('/api/rejectDeposit',adminAuth,markDepositFailed)
router.post("/api/deposit/submit-transaction-id", auth, submitTransactionIdManual);
router.post("/api/withdrawal", auth, processWithdrawal);
router.post("/api/delete-transaction", auth, deleteTransaction);

// Bank Account Routes (Protected routes, require authentication)
router.get("/api/checkBankDetails", auth, checkBankDetails); // Check bank details
router.post("/api/addBankAccount", auth, addBankAccount); // Add bank account
router.get("/api/getUserDetails", auth, getUserDetails); // Get user details
router.get("/api/getDeposits", auth, getDeposits); // Get deposits
router.post("/api/sellCrypto", auth, sellCrypto); // Sell crypto
router.get("/api/getSells", auth, getSells); // Get sells
router.post("/api/addWalletAddress", auth, addWalletAddress); // Add wallet address
router.post("/api/resetTransactionPassword", auth, resetTransactionPassword); // Reset transaction password
router.post(
  "/api/requestResetTransactionPassword",
  auth,
  requestResetTransactionPassword
); // Request reset transaction password
router.get("/api/getReferralCode",auth,getReferralCode)
router.get("/api/getUsdtPrice", getUsdtPrice); // Get USDT price
// router.post("/api/deleteUser",deleteUser)
router.get("/api/deleteTransactions",deleteTransactions)

// OTP Routes (These routes do not require authentication)
router.post("/api/otp/send-otp", sendOtp);
router.post("/api/otp/verify-otp", verifyOtp);
router.post("/api/user/check-registration",checkRegistration)

// Admin Routes
router.post("/api/admin/login", adminLogin);
router.get("/api/admin/sells", adminAuth, getAllSells);
router.post("/api/admin/getUserDetails", adminAuth, getUserDetailsUsingAdmin);
router.post("/api/admin/approveSell", adminAuth, approveSell);
router.post("/api/admin/rejectSell", adminAuth, rejectSell);
router.get("/api/admin/deposits", adminAuth, getAllDeposits);
router.post("/api/admin/rejectDeposit", adminAuth, rejectDeposit);
router.post("/api/admin/updatePrice", adminAuth, updatePrice);
router.get("/api/admin/getAllUserDetails", adminAuth, getAllUserDetailsUsingAdmin);
router.get("/api/commissionHistory", auth,referralCommissionController.getUserCommissions);
router.post('/api/admin/updateBalances',adminAuth,updateUserBalance);

module.exports = router;
