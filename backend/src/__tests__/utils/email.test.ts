import { 
  sendPasswordResetEmail, 
  sendPasswordChangedEmail 
} from '../../utils/email';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockImplementation((mailOptions, callback) => {
      if (callback) {
        callback(null, { messageId: 'test-message-id' });
      }
      return Promise.resolve({ messageId: 'test-message-id' });
    }),
    verify: jest.fn().mockResolvedValue(true)
  })
}));

describe('Email Utilities', () => {
  // Save original environment variables
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up test environment variables
    process.env.EMAIL_HOST = 'smtp.example.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'password123';
    process.env.EMAIL_FROM = 'noreply@example.com';
    process.env.FRONTEND_URL = 'https://example.com';
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('sendPasswordResetEmail', () => {
    it('should send a password reset email', async () => {
      const email = 'user@example.com';
      const token = 'reset-token-123';
      const name = 'Test User';

      const result = await sendPasswordResetEmail(email, token, name);

      expect(result).toBe(true);
    });

    it('should handle missing name parameter', async () => {
      const email = 'user@example.com';
      const token = 'reset-token-123';

      const result = await sendPasswordResetEmail(email, token);

      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Mock implementation to simulate an error
      const nodemailer = require('nodemailer');
      const originalTransport = nodemailer.createTransport;
      
      // Override the mock to simulate an error
      nodemailer.createTransport = jest.fn().mockReturnValue({
        sendMail: jest.fn().mockRejectedValue(new Error('Failed to send email')),
        verify: jest.fn().mockResolvedValue(true)
      });

      const email = 'user@example.com';
      const token = 'reset-token-123';

      try {
        const result = await sendPasswordResetEmail(email, token);
        expect(result).toBe(false);
      } finally {
        // Restore the original mock
        nodemailer.createTransport = originalTransport;
      }
    });
  });

  describe('sendPasswordChangedEmail', () => {
    it('should send a password changed confirmation email', async () => {
      const email = 'user@example.com';
      const name = 'Test User';

      const result = await sendPasswordChangedEmail(email, name);

      expect(result).toBe(true);
    });

    it('should handle missing name parameter', async () => {
      const email = 'user@example.com';

      const result = await sendPasswordChangedEmail(email);

      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Mock implementation to simulate an error
      const nodemailer = require('nodemailer');
      const originalTransport = nodemailer.createTransport;
      
      // Override the mock to simulate an error
      nodemailer.createTransport = jest.fn().mockReturnValue({
        sendMail: jest.fn().mockRejectedValue(new Error('Failed to send email')),
        verify: jest.fn().mockResolvedValue(true)
      });

      const email = 'user@example.com';

      try {
        const result = await sendPasswordChangedEmail(email);
        expect(result).toBe(false);
      } finally {
        // Restore the original mock
        nodemailer.createTransport = originalTransport;
      }
    });
  });
});
