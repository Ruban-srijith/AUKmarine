// backend/src/utils/tokenUtils.js
const crypto = require('crypto');

// Hash a raw token (e.g., refresh token or password reset token) using SHA-256.
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = { hashToken };
