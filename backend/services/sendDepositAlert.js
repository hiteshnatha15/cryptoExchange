const nodemailer = require("nodemailer");
require("dotenv").config();

const sendDepositAlert = async (adminEmail, depositDetails) => {
  try {
    // Create the transporter
    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: 587,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // Create the subject and email body dynamically for the deposit alert
    const subject = "New Deposit Alert - OnexCrypto";
    const body = `
      <h1>New Deposit Received</h1>
      <p>A new deposit has been made on the platform. Here are the details:</p>
      <ul>
        <li><strong>Transaction ID:</strong> ${depositDetails.transactionId}</li>
        <li><strong>Amount:</strong> ${depositDetails.amount} USDT</li>
        <li><strong>Network:</strong> ${depositDetails.network}</li>
        <li><strong>Status:</strong> ${depositDetails.status}</li>
        <li><strong>Remarks:</strong> ${depositDetails.remarks ? depositDetails.remarks : "N/A"}</li>
        <li><strong>Date:</strong> ${new Date(depositDetails.createdAt).toLocaleString()}</li>
      </ul>
      <br />
      <p>Please review the transaction on the admin panel.</p>
      <p>Thank you,<br>The OnexCrypto Team</p>
    `;

    // Send the email to the admin
    let info = await transporter.sendMail({
      from: `"OnexCrypto" <${process.env.MAIL_USER}>`, // Sender info
      to: adminEmail, // Admin email
      subject: subject, // Email subject
      html: body, // Email content (HTML)
    });
    return info;
  } catch (error) {
    console.log("Error sending email:", error.message);
    return error;
  }
};

module.exports = sendDepositAlert;
