// backend/src/services/emailService.js
// Simple email service placeholder – replace with real provider (e.g., SendGrid, Mailgun) in production.
const logger = require('../utils/logger');

async function sendPasswordReset(toEmail, resetUrl) {
  // In production, integrate with an email API.
  logger.info(`Sending password reset email to ${toEmail}: ${resetUrl}`);
  // Simulate async operation
  return Promise.resolve();
}

module.exports = { sendPasswordReset };
