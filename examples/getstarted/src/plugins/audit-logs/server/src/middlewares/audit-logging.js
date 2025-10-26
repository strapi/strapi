'use strict';

// Simple UUID generator (no external dependency needed)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Audit Logging Middleware
 * Captures API requests and responses to create audit log entries
 */
module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    // Skip if audit logging is disabled
    if (!config.enabled) {
      return next();
    }

    // Skip if this is an audit logs endpoint (to avoid infinite recursion)
    if (ctx.path.includes('/audit-logs')) {
      return next();
    }

    // Skip excluded content types
    const contentType = getContentTypeFromPath(ctx.path);
    if (contentType && config.excludeContentTypes?.includes(contentType)) {
      return next();
    }

    // Generate unique request ID for tracking
    const requestId = generateUUID();
    ctx.state.auditRequestId = requestId;

    // Capture request data
    const requestData = {
      method: ctx.method,
      path: ctx.path,
      query: ctx.query,
      body: ctx.request.body,
      headers: {
        'user-agent': ctx.get('user-agent'),
        'x-forwarded-for': ctx.get('x-forwarded-for'),
        'x-real-ip': ctx.get('x-real-ip'),
      },
    };

    // Store original body for later use
    ctx.state.auditRequestData = requestData;

    // Capture user information
    const user = ctx.state.user;
    const userInfo = user ? {
      id: user.id,
      email: user.email,
      role: user.role?.name || user.role?.code,
    } : null;

    // Get IP address
    const ipAddress = ctx.get('x-forwarded-for') || 
                     ctx.get('x-real-ip') || 
                     ctx.ip || 
                     ctx.request.ip;

    // Store user and IP info for later use
    ctx.state.auditUserInfo = userInfo;
    ctx.state.auditIpAddress = ipAddress;

    // Capture response data after the request is processed
    const originalSend = ctx.send;
    ctx.send = function(body) {
      // Store response data
      ctx.state.auditResponseData = {
        status: ctx.status,
        body: body,
      };
      
      // Call original send
      return originalSend.call(this, body);
    };

    try {
      await next();
    } catch (error) {
      // Store error information
      ctx.state.auditError = {
        message: error.message,
        stack: error.stack,
      };
      throw error;
    } finally {
      // Create audit log entry asynchronously
      setImmediate(async () => {
        try {
          await createAuditLogEntry(ctx, config);
        } catch (error) {
          strapi.log.error('Failed to create audit log entry:', error);
        }
      });
    }
  };
};

/**
 * Extract content type from API path
 * @param {string} path - API path
 * @returns {string|null} Content type name
 */
function getContentTypeFromPath(path) {
  // Match patterns like /api/content-type-name or /api/content-type-name/:id
  const match = path.match(/^\/api\/([^\/\?]+)/);
  return match ? match[1] : null;
}

/**
 * Determine action type from HTTP method and path
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @returns {string} Action type
 */
function getActionType(method, path) {
  if (method === 'POST') {
    return 'create';
  } else if (method === 'PUT' || method === 'PATCH') {
    return 'update';
  } else if (method === 'DELETE') {
    return 'delete';
  }
  return null;
}

/**
 * Extract content ID from path
 * @param {string} path - API path
 * @returns {string|null} Content ID
 */
function getContentIdFromPath(path) {
  // Match patterns like /api/content-type/:id
  const match = path.match(/^\/api\/[^\/\?]+\/([^\/\?]+)/);
  return match ? match[1] : null;
}

/**
 * Create audit log entry
 * @param {Object} ctx - Koa context
 * @param {Object} config - Plugin configuration
 */
async function createAuditLogEntry(ctx, config) {
  const contentType = getContentTypeFromPath(ctx.path);
  if (!contentType) {
    return; // Not a content API request
  }

  const action = getActionType(ctx.method, ctx.path);
  if (!action) {
    return; // Not a create/update/delete action
  }

  const contentId = getContentIdFromPath(ctx.path) || 
                   ctx.request.body?.id || 
                   ctx.state.auditResponseData?.body?.data?.id;

  if (!contentId && action !== 'create') {
    return; // Need content ID for update/delete actions
  }

  // Prepare audit log data
  const auditData = {
    contentType,
    contentId: contentId?.toString(),
    action,
    userId: ctx.state.auditUserInfo?.id,
    userEmail: ctx.state.auditUserInfo?.email,
    userRole: ctx.state.auditUserInfo?.role,
    ipAddress: ctx.state.auditIpAddress,
    userAgent: ctx.get('user-agent'),
    requestId: ctx.state.auditRequestId,
    timestamp: new Date(),
  };

  // Add action-specific data
  if (action === 'create') {
    auditData.newValues = ctx.request.body;
    auditData.metadata = {
      status: ctx.status,
      success: ctx.status < 400,
    };
  } else if (action === 'update') {
    auditData.changes = calculateChanges(
      ctx.state.auditRequestData?.body,
      ctx.state.auditResponseData?.body
    );
    auditData.previousValues = ctx.state.auditRequestData?.body;
    auditData.newValues = ctx.state.auditResponseData?.body?.data;
    auditData.metadata = {
      status: ctx.status,
      success: ctx.status < 400,
    };
  } else if (action === 'delete') {
    auditData.previousValues = ctx.state.auditResponseData?.body?.data;
    auditData.metadata = {
      status: ctx.status,
      success: ctx.status < 400,
    };
  }

  // Add error information if present
  if (ctx.state.auditError) {
    auditData.metadata = {
      ...auditData.metadata,
      error: ctx.state.auditError.message,
    };
  }

  // Create the audit log entry
  try {
    await strapi.plugin('audit-logs').service('audit-log').createLog(auditData);
  } catch (error) {
    strapi.log.error('Failed to create audit log:', error);
  }
}

/**
 * Calculate changes between old and new values
 * @param {Object} oldValues - Previous values
 * @param {Object} newValues - New values
 * @returns {Object} Changes object
 */
function calculateChanges(oldValues, newValues) {
  if (!oldValues || !newValues) {
    return {};
  }

  const changes = {};
  const newData = newValues.data || newValues;

  for (const key in newData) {
    if (oldValues[key] !== newData[key]) {
      changes[key] = {
        from: oldValues[key],
        to: newData[key],
      };
    }
  }

  return changes;
}
