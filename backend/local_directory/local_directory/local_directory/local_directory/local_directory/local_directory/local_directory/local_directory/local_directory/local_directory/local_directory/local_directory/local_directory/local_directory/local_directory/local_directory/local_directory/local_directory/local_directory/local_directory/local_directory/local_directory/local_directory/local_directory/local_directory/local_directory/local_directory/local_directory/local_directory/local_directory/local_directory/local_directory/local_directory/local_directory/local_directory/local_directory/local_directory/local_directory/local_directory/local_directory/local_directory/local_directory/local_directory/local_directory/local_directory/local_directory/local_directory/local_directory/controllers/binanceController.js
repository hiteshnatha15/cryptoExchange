const mongoose = require("mongoose");
const QRCode = require("qrcode");
const Binance = require("binance-api-node").default;
const Deposit = require("../models/depositModel");
const User = require("../models/userModel");
const Withdrawal = require("../models/withdrawlModel"); // Adjust the path as necessary
const Sell = require("../models/sellModel"); // Adjust the path as necessary
const Commission=require('../models/commissionModel')
const Admin = require('../models/adminModel');
const sendDepositAlert=require('../services/sendDepositAlert');

const binanceClient = Binance({
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_API_SECRET,
});

const addOrUpdateDepositAddress = async (req, res) => {
  const {BSC, TRX } = req.body; // Expecting username and new addresses in request body
  const userId=req.user.id;
  // Validate request data
  if (!userId || (!BSC && !TRX)) {
    return res.status(400).json({ message: "Username and at least one deposit address (BSC or TRX) are required." ,success:true});
  }

  try {
    // Find the admin by username
    const admin = await Admin.findById(userId);
      // If admin exists, update deposit addresses
      if (BSC) admin.depositAddress.BSC = BSC; // Update BSC address if provided
      if (TRX) admin.depositAddress.TRX = TRX; // Update TRX address if provided

      await admin.save();
      return res.status(200).json({ message: "Deposit addresses updated successfully", admin ,success:true});

  } catch (error) {
    console.error("Error adding/updating deposit address:", error);
    return res.status(500).json({ message: "Server error", error: error.message ,success:false});
  }
};


const getDepositAddressManual = async (req, res) => {
  const { network, amount } = req.body; // Expecting network and amount in request body
  const userId = req.user.id;

  // Validate network parameter
  if (!["BSC", "TRX"].includes(network)) {
    return res.status(400).json({
      message: "Invalid network. Only 'BSC' (BEP-20) and 'TRX' (TRC-20) are allowed.",
      success: false,
    });
  }

  if (!amount || !userId || !network) {
    return res.status(400).json({
      message: "Amount and userId are required.",
      success: false,
    });
  }

  try {
    // Fetch the admin details
    const admin = await Admin.findOne({}); // Modify this query if you have a specific admin to fetch

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found.",
        success: false,
      });
    }

    // Get the deposit address based on the network
    const depositAddress = admin.depositAddress[network];

    if (!depositAddress) {
      return res.status(404).json({
        message: `No deposit address found for ${network}.`,
        success: false,
      });
    }

    // Generate QR code for the deposit address
    const qrCodeUrl = await QRCode.toDataURL(depositAddress);

    // Save the deposit transaction to the database
    const newDeposit = new Deposit({
      userId: new mongoose.Types.ObjectId(userId),
      address: depositAddress,
      network: network,
      amount: amount,
      status: "pending",
      transactionId: "", // Transaction ID will be entered later
    });

    const savedDeposit = await newDeposit.save();
    const id = savedDeposit._id;

    // Respond with deposit address and QR code
    res.json({
      id: id,
      address: depositAddress,
      qrCodeUrl: qrCodeUrl,
      amount: amount,
      network: network,
      createdAt: savedDeposit.createdAt,
      message: "Deposit address and QR code generated successfully from admin.",
      success: true,
    });
  } catch (error) {
    console.error("Error retrieving deposit address:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving deposit address",
      error: error.message,
    });
  }
};

// Generate deposit address and QR code
const generateDepositAddress = async (req, res) => {
  const { amount, network } = req.body;
  const userId = req.user.id;
  console.log(req.user.id);
  if (!amount || !userId || !network) {
    return res.status(400).json({
      message: "Amount, userId, and network are required.",
      success: false,
    });
  }
  // Allow only 'ETH' (ERC-20) and 'TRX' (TRC-20) networks
  if (!["TRX", "BSC"].includes(network)) {
    return res.status(400).json({
      message:
        "Invalid network. Only 'BSC' (BEP-20) and 'TRX' (TRC-20) are allowed.",
      success: false,
    });
  }

  try {
    // Fetch deposit address from Binance
    const depositAddress = await binanceClient.depositAddress({
      coin: "USDT",
      network: network,
    });

    // Generate QR code for the deposit address
    const qrCodeUrl = await QRCode.toDataURL(depositAddress.address);

    // Save the deposit transaction to the database
    const newDeposit = new Deposit({
      userId: new mongoose.Types.ObjectId(userId),
      address: depositAddress.address,
      network: network,
      amount: amount,
      status: "pending",
      transactionId: "", // Transaction ID will be entered later
    });

    const savedDeposit = await newDeposit.save();
    const id = savedDeposit._id;
    res.json({
      id: id,
      address: depositAddress.address,
      qrCodeUrl: qrCodeUrl,
      amount: amount,
      network: network,
      createdAt: savedDeposit.createdAt,
      message: "Deposit address and QR code generated successfully.",
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error generating deposit address",
      error: error.message,
    });
  }
};

const deleteTransaction = async (req, res) => {
  const { transactionId } = req.body;
  const userId = req.user.id;
  if (!transactionId || !userId) {
    return res.status(400).json({
      message: "Transaction ID and user ID are required.",
      success: false,
    });
  }
  const deposit = await Deposit.findOne({
    _id: transactionId,
  });
  if (!deposit) {
    return res.status(404).json({
      success: false,
      message: "No deposit found for this user.",
    });
  }
  await Deposit.findByIdAndDelete(transactionId);
  res.json({
    success: true,
    message: "Deposit deleted successfully.",
  });
};

const submitTransactionId = async (req, res) => {
  const { transactionId, depositId } = req.body;
  const userId = req.user.id;

  if (!userId || !transactionId || !depositId) {
    return res.status(400).json({
      message: "User ID, transaction ID, and deposit ID are required.",
      success: false,
    });
  }

  try {
    // Find the pending deposit for the user
    const deposit = await Deposit.findById(depositId);
    if (!deposit) {
      return res.status(404).json({
        message: "No pending deposit found for this user.",
        success: false,
      });
    }

    // Check if the deposit is already completed
    if (deposit.status === "completed") {
      return res.status(400).json({
        message: "This deposit has already been completed.",
        success: false,
      });
    }

    // Check if the transaction ID has already been submitted
    if (deposit.transactionId) {
      return res.status(400).json({
        message: "Transaction ID has already been submitted for this deposit.",
        success: false,
      });
    }

    // Check if the transaction ID is already used in any deposit
    const existingDeposit = await Deposit.findOne({ transactionId });
    if (existingDeposit) {
      return res.status(400).json({
        message: "This transaction ID has already been used.",
        success: false,
      });
    }

    // Update the deposit with the provided transaction ID
    deposit.transactionId = transactionId;
    await deposit.save();

    // Log transactionId being submitted for Binance check
    console.log(`Checking Binance for transactionId: ${transactionId}`);

    // Check the deposit status using Binance API
    const deposits = await binanceClient.depositHistory({
      coin: "USDT",
      network: deposit.network,
    });

    // Find the deposit that matches the transaction ID
    const matchingDeposit = deposits.find((d) => d.txId === transactionId);

    if (matchingDeposit) {
      console.log("Matching deposit found:", matchingDeposit);

      // Check if the amount matches
      const amountInDeposit = parseFloat(deposit.amount); // Amount from your deposit record
      const amountInBinance = parseFloat(matchingDeposit.amount); // Amount from Binance

      if (amountInDeposit !== amountInBinance) {
        return res.status(400).json({
          success: false,
          message: "The deposit amount does not match the transaction amount from Binance.",
        });
      }

      // Update the deposit status based on Binance response
      deposit.status = matchingDeposit.status === 1 ? "completed" : "failed";
      await deposit.save();

      // Only update the user's balance if the deposit is successful and hasn't been processed yet
      if (deposit.status === "completed" && !existingDeposit) {
        const balanceUpdate =
          deposit.network === "BSC"
            ? { $inc: { "balances.bep20": deposit.amount } }
            : { $inc: { "balances.trc20": deposit.amount } };

        // Update user's balance
        await User.findByIdAndUpdate(userId, balanceUpdate);

        // Check if the user was referred by someone
        const user = await User.findById(userId);
        if (user.referredBy) {
          // Find the referrer
          const referrer = await User.findOne({ referralCode: user.referredBy });
          if (referrer) {
            // Calculate 0.1% commission on the deposit amount
            const commission = amountInDeposit * 0.001;
          
            // Update the referrer's commission balance
            referrer.balances.commission += commission;
          
            // Save the referrer
            await referrer.save();
            
            // Log the referrer's updated balance
            console.log(`Updated commission balance for ${referrer.mobile}: ${referrer.balances.commission}`);
          
            // Create an entry in the Commission model
            const commissionEntry = new Commission({
              userId: referrer._id, // Referrer ID
              depositId: deposit._id, // Deposit associated with the commission
              amount: commission, // Commission amount
              commissionAmount: commission, // Assuming this is the same as amount
              referredUserId: userId, // ID of the user who referred
              referrerId: referrer._id, // ID of the referrer
            });
            await commissionEntry.save();
          
            console.log(`Commission of ${commission} credited to referrer ${referrer.mobile} and saved in commission model.`);
          } else {
            console.warn("Referrer not found with the provided referral code.");
          }
        } else {
          console.warn("User does not have a referrer.");
        }
      }

      res.json({
        success: true,
        message: "Deposit status updated successfully.",
        status: deposit.status,
      });
    } else {
      console.log("Transaction ID not found in Binance deposit history.");
      res.status(404).json({
        success: false,
        message: "Transaction ID not found in Binance deposit history.",
      });
    }
  } catch (error) {
    console.error("Error checking deposit status:", error);
    res.status(500).json({
      success: false,
      message: "Error checking deposit status",
      error: error.message,
    });
  }
};

const submitTransactionIdManual = async (req, res) => {
  const { transactionId, depositId } = req.body;
  const userId = req.user.id;

  if (!userId || !transactionId || !depositId) {
    return res.status(400).json({
      message: "User ID, transaction ID, and deposit ID are required.",
      success: false,
    });
  }

  try {
    // Find the pending deposit for the user
    const deposit = await Deposit.findById(depositId);
    if (!deposit) {
      return res.status(404).json({
        message: "No pending deposit found for this user.",
        success: false,
      });
    }

    // Check if the deposit is already completed
    if (deposit.status === "completed") {
      return res.status(400).json({
        message: "This deposit has already been completed.",
        success: false,
      });
    }

    // Check if the transaction ID has already been submitted
    if (deposit.transactionId) {
      return res.status(400).json({
        message: "Transaction ID has already been submitted for this deposit.",
        success: false,
      });
    }

    // Check if the transaction ID is already used in any deposit
    const existingDeposit = await Deposit.findOne({ transactionId });
    if (existingDeposit) {
      return res.status(400).json({
        message: "This transaction ID has already been used.",
        success: false,
      });
    }

    // Update the deposit with the provided transaction ID
    deposit.transactionId = transactionId;
    await deposit.save();

    // Send an email alert to the admin
    const adminEmail = "onexcryptocom@gmail.com"; // Replace with your admin email
    const depositDetails = {
      transactionId: deposit.transactionId,
      amount: deposit.amount, // Assuming you have an amount field
      network: deposit.network, // Assuming you have a network field
      status: deposit.status,
      remarks: deposit.remarks || "N/A", // Assuming you have a remarks field
      createdAt: deposit.createdAt,
    };
    // The status remains "pending" until the admin confirms it
    res.json({
      success: true,
      message: "Transaction ID submitted successfully. Awaiting admin confirmation.",
      status: deposit.status,
    });
    await sendDepositAlert(adminEmail, depositDetails);
  } catch (error) {
    console.error("Error submitting transaction ID manually:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting transaction ID",
      error: error.message,
    });
  }
};
const approveTransactionManual = async (req, res) => {
  const { depositId } = req.body;
  const adminId = req.user.id; // Assuming the admin's ID is available from the authenticated request

  if (!depositId || !adminId) {
    return res.status(400).json({
      message: "Deposit ID and admin ID are required.",
      success: false,
    });
  }

  try {
    // Find the deposit by ID
    const deposit = await Deposit.findById(depositId);
    if (!deposit) {
      return res.status(404).json({
        message: "Deposit not found.",
        success: false,
      });
    }

    // Check if the deposit is already completed
    if (deposit.status === "completed") {
      return res.status(400).json({
        message: "This deposit has already been completed.",
        success: false,
      });
    }

    // Update the deposit status to "completed"
    deposit.status = "completed";
    await deposit.save();

    // Find the user who made the deposit
    const user = await User.findById(deposit.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }

    // Update the user's balance based on the deposit network
    const balanceUpdate =
      deposit.network === "BSC"
        ? { $inc: { "balances.bep20": deposit.amount } }
        : { $inc: { "balances.trc20": deposit.amount } };

    await User.findByIdAndUpdate(deposit.userId, balanceUpdate);

    // Check if the user was referred by someone
    if (user.referredBy) {
      // Find the referrer
      const referrer = await User.findOne({ referralCode: user.referredBy });
      if (referrer) {
        // Calculate 0.1% commission on the deposit amount
        const commission = deposit.amount * 0.001;

        // Update the referrer's commission balance
        referrer.balances.commission += commission;

        // Save the referrer
        await referrer.save();

        console.log(`Updated commission balance for ${referrer.mobile}: ${referrer.balances.commission}`);

        // Create an entry in the Commission model
        const commissionEntry = new Commission({
          userId: referrer._id, // Referrer ID
          depositId: deposit._id, // Deposit associated with the commission
          amount: commission, // Commission amount
          commissionAmount: commission, // Assuming this is the same as amount
          referredUserId: deposit.userId, // ID of the user who was referred
          referrerId: referrer._id, // ID of the referrer
        });
        await commissionEntry.save();

        console.log(`Commission of ${commission} credited to referrer ${referrer.mobile} and saved in commission model.`);
      } else {
        console.warn("Referrer not found with the provided referral code.");
      }
    } else {
      console.warn("User does not have a referrer.");
    }

    res.json({
      success: true,
      message: "Deposit approved and user balance updated successfully.",
      status: deposit.status,
    });
  } catch (error) {
    console.error("Error approving deposit:", error);
    res.status(500).json({
      success: false,
      message: "Error approving deposit",
      error: error.message,
    });
  }
};

const markDepositFailed = async (req, res) => {
  const { depositId ,remarks} = req.body;

  if (!depositId || !remarks) {
    return res.status(400).json({
      message: "Deposit ID is required.",
      success: false,
    });
  }
  try {
    // Find the deposit by ID
    const deposit = await Deposit.findById(depositId);
    if (!deposit) {
      return res.status(404).json({
        message: "Deposit not found.",
        success: false,
      });
    }

    // Check if the deposit is already completed
    if (deposit.status === "completed") {
      return res.status(400).json({
        message: "This deposit has already been completed and cannot be marked as failed.",
        success: false,
      });
    }

    // Update the deposit status to "failed"
    deposit.status = "failed";
    deposit.remarks=remarks;
    await deposit.save();

    res.json({
      success: true,
      message: "Deposit marked as failed successfully.",
      status: deposit.status,
    });
  } catch (error) {
    console.error("Error marking deposit as failed:", error);
    res.status(500).json({
      success: false,
      message: "Error marking deposit as failed",
      error: error.message,
    });
  }
};


// Process withdrawal
const processWithdrawal = async (req, res) => {
  const { userId, amount, address, network } = req.body;

  if (!userId || !amount || !address || !network) {
    return res
      .status(400)
      .json({ message: "User ID, amount, address, and network are required." });
  }

  let newWithdrawal;

  try {
    // Create a new withdrawal record with status 'pending'
    newWithdrawal = new Withdrawal({
      userId: new mongoose.Types.ObjectId(userId),
      amount,
      address,
      network,
      status: "pending",
    });

    await newWithdrawal.save();

    // Process the withdrawal
    const withdrawResponse = await binanceClient.withdraw({
      asset: "USDT",
      address: address,
      amount: amount,
      network: network,
    });

    // Update the withdrawal record with the result
    newWithdrawal.status = "completed";
    await newWithdrawal.save();

    res.json({
      message: "Withdrawal processed successfully",
      withdrawResponse: withdrawResponse,
    });
  } catch (error) {
    console.error(error);

    // Update the withdrawal record with the error status
    if (newWithdrawal) {
      try {
        newWithdrawal.status = "failed";
        await newWithdrawal.save();
      } catch (dbError) {
        console.error("Error updating withdrawal status:", dbError.message);
      }
    }

    res.status(500).json({
      message: "Error processing withdrawal",
      error: error.message,
    });
  }
};

const updatePendingDeposits = async () => {
  try {
    // Find all deposits with pending status
    const pendingDeposits = await Deposit.find({ status: "pending" });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // Time limit set to one hour

    for (const deposit of pendingDeposits) {
      // Check if the deposit is older than one hour
      if (deposit.createdAt < oneHourAgo) {
        // If the deposit is pending for more than one hour, delete it
        await Deposit.findByIdAndDelete(deposit._id);
        console.log(`Deleted deposit with transaction ID: ${deposit.transactionId} (pending for more than 1 hour)`);
        continue; // Skip to the next iteration
      }

      // Check the deposit status using Binance API
      const deposits = await binanceClient.depositHistory({
        coin: "USDT",
        network: deposit.network,
      });

      // Find the deposit that matches the transaction ID
      const matchingDeposit = deposits.find(
        (d) => d.txId === deposit.transactionId
      );

      if (matchingDeposit) {
        // Check if the amount matches
        const amountInDeposit = parseFloat(deposit.amount); // Amount from your deposit record
        const amountInBinance = parseFloat(matchingDeposit.amount); // Amount from Binance

        if (amountInDeposit === amountInBinance) {
          // Update the deposit status based on Binance response
          deposit.status =
            matchingDeposit.status === 1 ? "completed" : "failed";
          await deposit.save();

          // Only update the user's balance if the deposit is successful
          if (deposit.status === "completed") {
            const balanceUpdate =
              deposit.network === "BSC"
                ? { $inc: { "balances.bep20": deposit.amount } }
                : { $inc: { "balances.trc20": deposit.amount } };

            await User.findByIdAndUpdate(deposit.userId, balanceUpdate);
          }
        }
      } else {
        console.log(
          `Transaction ID ${deposit.transactionId} not found in Binance deposit history.`
        );
      }
    }

    console.log("Pending deposit statuses checked and updated.");
  } catch (error) {
    console.error("Error updating pending deposits:", error);
  }
};


const sellCrypto = async (req, res) => {
  const { usdtAmount, rupeeAmount, network, transactionPassword } = req.body;
  const userId = req.user.id;

  if (
    !usdtAmount ||
    !rupeeAmount ||
    !userId ||
    !network ||
    !transactionPassword
  ) {
    return res.status(400).json({
      message: "USDT amount, rupee amount, userId, and network are required.",
      success: false,
    });
  }

  if (!["TRX", "BSC"].includes(network)) {
    return res.status(400).json({
      message:
        "Invalid network. Only 'BSC' (BEP-20) and 'TRX' (TRC-20) are allowed.",
      success: false,
    });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }
    if (!user.transactionPassword) {
      return res.status(400).json({
        message: "Transaction Password not set.",
        success: false,
      });
    }
    if (user.transactionPassword !== transactionPassword) {
      return res.status(400).json({
        message: "Invalid Transaction Password.",
        success: false,
      });
    }
    if (
      // Check if bank details (accountNumber, accountHolderName, and ifscCode) are missing
      (!user.bankDetails.accountNumber ||
        !user.bankDetails.accountHolderName ||
        !user.bankDetails.ifscCode) &&
       // Check if UPI ID is also missing
      !user.bankDetails.upiId
    ) {
      return res.status(400).json({
        message: "Either complete bank details or UPI ID must be set.",
        success: false,
      });
    }
    

    const balanceField = network === "BSC" ? "bep20" : "trc20";
    let availableBalance = user.balances[balanceField];
    let commission = user.balances.commission; // Assuming there is a commission field in balances

    console.log(`Available balance for ${network}: ${availableBalance}`);
    console.log(`Commission balance: ${commission}`);
    console.log(`Attempting to deduct USDT amount: ${usdtAmount}`);

    // Check if commission and available balance together cover the USDT amount
    if (commission + availableBalance < usdtAmount) {
      return res.status(400).json({
        message: "Insufficient balance, including commission.",
        success: false,
      });
    }

    let remainingUSDT = usdtAmount;

    // Deduct from commission first
    if (commission >= remainingUSDT) {
      user.balances.commission -= remainingUSDT;
      remainingUSDT = 0;
    } else {
      remainingUSDT -= commission;
      user.balances.commission = 0;
    }

    // Deduct from main balance if necessary
    if (remainingUSDT > 0) {
      user.balances[balanceField] -= remainingUSDT;
    }

    user.balances.processing += usdtAmount; // Move the entire amount to 'processing'
    await user.save();

    const newSell = new Sell({
      userId: new mongoose.Types.ObjectId(userId),
      usdtAmount,
      rupeeAmount,
      network,
      status: "pending",
      bankDetails: {
        accountNumber: user.bankDetails.accountNumber,
        accountHolderName: user.bankDetails.accountHolderName,
        ifscCode: user.bankDetails.ifscCode,
        upiId:user.bankDetails.upiId,
      },
    });

    const result = await newSell.save();

    res.json({
      message: "Sell transaction is in process",
      success: true,
    });
  } catch (error) {
    console.error("Error processing sell transaction:", error);
    res.status(500).json({
      message: "Error processing sell transaction",
      error: error.message,
      success: false,
    });
  }
};

module.exports = {
  generateDepositAddress,
  addOrUpdateDepositAddress,
  getDepositAddressManual,
  submitTransactionId,
  processWithdrawal,
  deleteTransaction,
  updatePendingDeposits,
  sellCrypto,
  approveTransactionManual,
  submitTransactionIdManual,
  markDepositFailed
};
