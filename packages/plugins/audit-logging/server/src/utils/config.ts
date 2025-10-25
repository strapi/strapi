import type { Core } from '@strapi/types';

interface AuditLogConfig {
  enabled?: boolean;
  excludeContentTypes?: string[];
  retentionDays?: number;
  captureUserAgent?: boolean;
  captureIpAddress?: boolean;
}

const DEFAULT_CONFIG: AuditLogConfig = {
  enabled: true,
  excludeContentTypes: [
    'strapi::core-store',
    'admin::permission',
    'admin::role',
    'admin::api-token',
    'admin::transfer-token',
    'plugin::upload.file',
    'plugin::upload.folder',
  ],
  retentionDays: 365,
  captureUserAgent: true,
  captureIpAddress: true,
};

/**
 * Get audit logging configuration with defaults
 */
export const getAuditLogConfig = (strapi: Core.Strapi): AuditLogConfig => {
  const pluginConfig = strapi.config.get('plugin::audit-logging', {});
  const auditLogConfig = pluginConfig.auditLog || {};

  return {
    ...DEFAULT_CONFIG,
    ...auditLogConfig,
  };
};

/**
 * Check if audit logging is enabled globally
 */
export const isAuditLoggingEnabled = (strapi: Core.Strapi): boolean => {
  const config = getAuditLogConfig(strapi);
  return config.enabled !== false;
};

/**
 * Check if a content type should be excluded from audit logging
 */
export const isContentTypeExcluded = (strapi: Core.Strapi, contentType: string): boolean => {
  const config = getAuditLogConfig(strapi);
  const excludeList = config.excludeContentTypes || [];
  return excludeList.includes(contentType);
};

/**
 * Check if audit logging is enabled for a specific content type
 */
export const isLoggingEnabledForContentType = (strapi: Core.Strapi, contentType: string): boolean => {
  if (!isAuditLoggingEnabled(strapi)) {
    return false;
  }

  if (isContentTypeExcluded(strapi, contentType)) {
    return false;
  }

  return true;
};

/**
 * Validate audit logging configuration
 */
export const validateAuditLogConfig = (config: AuditLogConfig): string[] => {
  const errors: string[] = [];

  if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
    errors.push('auditLog.enabled must be a boolean');
  }

  if (config.excludeContentTypes !== undefined) {
    if (!Array.isArray(config.excludeContentTypes)) {
      errors.push('auditLog.excludeContentTypes must be an array');
    } else {
      const invalidTypes = config.excludeContentTypes.filter(
        (type) => typeof type !== 'string'
      );
      if (invalidTypes.length > 0) {
        errors.push('auditLog.excludeContentTypes must contain only strings');
      }
    }
  }

  if (config.retentionDays !== undefined) {
    if (typeof config.retentionDays !== 'number' || config.retentionDays < 1) {
      errors.push('auditLog.retentionDays must be a positive number');
    }
  }

  if (config.captureUserAgent !== undefined && typeof config.captureUserAgent !== 'boolean') {
    errors.push('auditLog.captureUserAgent must be a boolean');
  }

  if (config.captureIpAddress !== undefined && typeof config.captureIpAddress !== 'boolean') {
    errors.push('auditLog.captureIpAddress must be a boolean');
  }

  return errors;
};

/**
 * Get environment variable overrides for audit log configuration
 */
export const getEnvironmentOverrides = (): Partial<AuditLogConfig> => {
  const overrides: Partial<AuditLogConfig> = {};

  if (process.env.STRAPI_AUDIT_LOG_ENABLED !== undefined) {
    overrides.enabled = process.env.STRAPI_AUDIT_LOG_ENABLED === 'true';
  }

  if (process.env.STRAPI_AUDIT_LOG_RETENTION_DAYS !== undefined) {
    const retentionDays = parseInt(process.env.STRAPI_AUDIT_LOG_RETENTION_DAYS, 10);
    if (!isNaN(retentionDays) && retentionDays > 0) {
      overrides.retentionDays = retentionDays;
    }
  }

  if (process.env.STRAPI_AUDIT_LOG_CAPTURE_USER_AGENT !== undefined) {
    overrides.captureUserAgent = process.env.STRAPI_AUDIT_LOG_CAPTURE_USER_AGENT === 'true';
  }

  if (process.env.STRAPI_AUDIT_LOG_CAPTURE_IP_ADDRESS !== undefined) {
    overrides.captureIpAddress = process.env.STRAPI_AUDIT_LOG_CAPTURE_IP_ADDRESS === 'true';
  }

  return overrides;
};