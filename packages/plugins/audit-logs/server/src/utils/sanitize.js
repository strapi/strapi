'use strict';

/**
 * Sanitize data by removing or redacting sensitive fields
 * Used across all payload strategies to prevent logging sensitive information
 * @param {object} data - The data to sanitize
 * @returns {object} Sanitized data with sensitive fields redacted
 */
function sanitizeData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Create a shallow copy to avoid mutating the original
  const sanitized = { ...data };

  // List of sensitive fields that should be redacted
  const sensitiveFields = [
    'password',
    'passwordHash',
    'resetPasswordToken',
    'confirmationToken',
    'apiToken',
    'secret',
    'privateKey',
    'accessToken',
    'refreshToken',
  ];

  // Redact sensitive fields
  sensitiveFields.forEach((field) => {
    if (sanitized[field] !== undefined && sanitized[field] !== null) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

module.exports = {
  sanitizeData,
};
