import nodemailer from 'nodemailer';

// Email configuration
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.example.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER || 'user@example.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'password';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@yourbusiness.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Create a transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT === 465, // true for 465, false for other ports
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

/**
 * Send a password reset email
 * @param to Recipient email
 * @param token Reset token
 * @param name User's name
 */
export const sendPasswordResetEmail = async (
  to: string,
  token: string,
  name?: string
): Promise<boolean> => {
  const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;
  const greeting = name ? `Hello ${name},` : 'Hello,';

  try {
    await transporter.sendMail({
      from: `"Business Management System" <${EMAIL_FROM}>`,
      to,
      subject: 'Reset Your Password',
      text: `${greeting}\n\nYou requested a password reset. Please click the link below to reset your password:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nRegards,\nBusiness Management System Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>${greeting}</p>
          <p>You requested a password reset. Please click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
          </div>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Regards,<br>Business Management System Team</p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777;">
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p>${resetLink}</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

/**
 * Send a password changed confirmation email
 * @param to Recipient email
 * @param name User's name
 */
export const sendPasswordChangedEmail = async (
  to: string,
  name?: string
): Promise<boolean> => {
  const greeting = name ? `Hello ${name},` : 'Hello,';

  try {
    await transporter.sendMail({
      from: `"Business Management System" <${EMAIL_FROM}>`,
      to,
      subject: 'Your Password Has Been Changed',
      text: `${greeting}\n\nYour password has been successfully changed.\n\nIf you didn't make this change, please contact our support team immediately.\n\nRegards,\nBusiness Management System Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Changed</h2>
          <p>${greeting}</p>
          <p>Your password has been successfully changed.</p>
          <p>If you didn't make this change, please contact our support team immediately.</p>
          <p>Regards,<br>Business Management System Team</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Error sending password changed email:', error);
    return false;
  }
};
