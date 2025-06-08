const ReferralCommission = require("../models/commissionModel");

const referralCommissionController = {
  getUserCommissions: async (req, res) => {
    const userId = req.user.id;

    try {
      // Retrieve all commission records where the user is the referrer
      const commissions = await ReferralCommission.find({ referrerId: userId }).populate("referredUserId depositId");

      // Map the commissions to include only the necessary balance information
      const commissionBalances = commissions.map((commission) => ({
        id: commission._id,
        depositId: commission.depositId._id,
        depositAmount: commission.depositId.amount,
        commissionAmount: commission.commissionAmount,
        createdAt: commission.createdAt,
      }));

      res.status(200).json({
        success: true,
        message: "Referral commission history retrieved successfully",
        data: commissionBalances, // Send only the balances
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve referral commission history",
        error: error.message,
      });
    }
  },
};

module.exports = referralCommissionController;
