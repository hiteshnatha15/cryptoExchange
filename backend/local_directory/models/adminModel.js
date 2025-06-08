const mongoose = require("mongoose");

const adminModel = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  depositAddress: {
    BSC: {
      type: String, // For BEP20 deposit address
    },
    TRX: {
      type: String, // For TRC20 deposit address
    },
  },
});

// Export the model
module.exports = mongoose.model("Admin", adminModel);


const Admin = mongoose.model("Admin", adminModel);
module.exports = Admin;
