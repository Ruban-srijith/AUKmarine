const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const { hashToken } = require('../utils/tokenUtils');

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'super-secret-key-change-this-in-production',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

// Login User
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: `User logged in: ${user.email}`
      }
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get current user profile
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password - Mock Implementation
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address'
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Do not disclose if email exists; log for internal monitoring
      logger.info(`Password reset request for ${email} - user not found`);
    } else {
      // Generate secure token, store hashed version, and send email
      const raw = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(raw);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${raw}&email=${encodeURIComponent(email)}`;
      await emailService.sendPasswordReset(email, resetUrl);
    }

    // Generic success response (always the same)
    res.status(200).json({
      success: true,
      message: 'If the email belongs to a registered user, we have sent you a code through email.'
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password - Mock Implementation
const resetPassword = async (req, res, next) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, reset code and new password'
      });
    }

    if (resetCode !== 'RESET-123456') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset code'
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { email },
      data: { passwordHash: hashedPassword }
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'RESET_PASSWORD',
        details: `User reset password: ${user.email}`
      }
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
  forgotPassword,
  resetPassword
};
