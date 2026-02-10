const nodemailer = require("nodemailer");
require("dotenv").config();

// IMPORTANT: Create a reusable transporter for sending emails
// NOTE: Configure SMTP settings in .env file
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// NOTA BENE: This function sends verification email asynchronously
// It does NOT block registration — user is registered immediately
// NOTE: If email sending fails, it only logs the error
async function sendVerificationEmail(email, token) {
  const verificationLink = `${process.env.APP_URL}/verify/${token}`;
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Verify your email - User Management App",
      html: `
        <h2>Email Verification</h2>
        <p>Click the link below to verify your email address:</p>
        <a href="${verificationLink}">${verificationLink}</a>
        <p>If you did not register, please ignore this email.</p>
      `,
    });
    console.log(`Verification email sent to ${email}`);
  } catch (err) {
    // IMPORTANT: Do not throw — email failure should not block registration
    console.error("Failed to send verification email:", err.message);
  }
}

module.exports = { sendVerificationEmail };
