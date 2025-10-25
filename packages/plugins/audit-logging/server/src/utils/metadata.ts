import type { Core } from '@strapi/types';
import { getAuditLogConfig } from './config';

interface RequestContext {
  state?: {
    user?: {
      id: number;
      [key: string]: any;
    };
  };
  request?: {
    header?: {
      'user-agent'?: string;
      [key: string]: any;
    };
    ip?: string;
    ips?: string[];
  };
}

interface AuditMetadata {
  userId?: number;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Extract user information from request context
 */
export const extractUserInfo = (ctx?: RequestContext): { userId?: number } => {
  if (!ctx?.state?.user?.id) {
    return {};
  }

  return {
    userId: ctx.state.user.id,
  };
};

/**
 * Extract IP address from request context
 */
export const extractIpAddress = (ctx?: RequestContext): string | undefined => {
  if (!ctx?.request) {
    return undefined;
  }

  // Check for forwarded IPs first (proxy/load balancer scenarios)
  if (ctx.request.ips && ctx.request.ips.length > 0) {
    return ctx.request.ips[0];
  }

  // Fall back to direct IP
  return ctx.request.ip;
};

/**
 * Extract user agent from request context
 */
export const extractUserAgent = (ctx?: RequestContext): string | undefined => {
  return ctx?.request?.header?.['user-agent'];
};

/**
 * Extract all audit metadata from request context
 */
export const extractAuditMetadata = (strapi: Core.Strapi, ctx?: RequestContext): AuditMetadata => {
  const config = getAuditLogConfig(strapi);
  const metadata: AuditMetadata = {};

  // Extract user information
  const userInfo = extractUserInfo(ctx);
  if (userInfo.userId) {
    metadata.userId = userInfo.userId;
  }

  // Extract IP address if enabled
  if (config.captureIpAddress) {
    const ipAddress = extractIpAddress(ctx);
    if (ipAddress) {
      metadata.ipAddress = ipAddress;
    }
  }

  // Extract user agent if enabled
  if (config.captureUserAgent) {
    const userAgent = extractUserAgent(ctx);
    if (userAgent) {
      metadata.userAgent = userAgent;
    }
  }

  return metadata;
};

/**
 * Extract changed fields by comparing old and new data
 */
export const extractChangedFields = (oldData: any, newData: any): any => {
  if (!oldData || !newData) {
    return null;
  }

  const changedFields: any = {};
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const key of allKeys) {
    // Skip system fields that change automatically
    if (['id', 'createdAt', 'updatedAt', 'publishedAt'].includes(key)) {
      continue;
    }

    const oldValue = oldData[key];
    const newValue = newData[key];

    // Simple comparison - for complex objects, you might want to use deep comparison
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changedFields[key] = newValue;
    }
  }

  return Object.keys(changedFields).length > 0 ? changedFields : null;
};

/**
 * Sanitize payload data to remove sensitive information
 */
export const sanitizePayload = (data: any, contentType?: string): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };

  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'resetPasswordToken',
    'confirmationToken',
    'blocked',
    'preferedLanguage',
  ];

  sensitiveFields.forEach((field) => {
    if (field in sanitized) {
      delete sanitized[field];
    }
  });

  // Remove system fields that are not useful for auditing
  const systemFields = ['createdBy', 'updatedBy'];
  systemFields.forEach((field) => {
    if (field in sanitized) {
      delete sanitized[field];
    }
  });

  return sanitized;
};

/**
 * Prepare audit entry data from operation context
 */
export const prepareAuditEntryData = (
  strapi: Core.Strapi,
  {
    contentType,
    recordId,
    action,
    oldData,
    newData,
    ctx,
  }: {
    contentType: string;
    recordId: string;
    action: 'create' | 'update' | 'delete';
    oldData?: any;
    newData?: any;
    ctx?: RequestContext;
  }
) => {
  const metadata = extractAuditMetadata(strapi, ctx);
  
  let payload = null;
  let changedFields = null;

  switch (action) {
    case 'create':
      payload = sanitizePayload(newData, contentType);
      break;
    case 'update':
      changedFields = extractChangedFields(oldData, newData);
      break;
    case 'delete':
      payload = sanitizePayload(oldData, contentType);
      break;
  }

  return {
    contentType,
    recordId: String(recordId),
    action,
    userId: metadata.userId,
    payload,
    changedFields,
    timestamp: new Date(),
    userAgent: metadata.userAgent,
    ipAddress: metadata.ipAddress,
  };
};