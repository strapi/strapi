'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    // Register audit logging middleware
    strapi.server.use(async (ctx, next) => {
      // Skip if this is an audit logs endpoint (to avoid infinite recursion)
      if (ctx.path.includes('/audit-logs')) {
        return next();
      }

      // Generate unique request ID for tracking
      const requestId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });

      // Store request data
      ctx.state.auditRequestId = requestId;
      ctx.state.auditRequestData = {
        method: ctx.method,
        path: ctx.path,
        query: ctx.query,
        body: ctx.request.body,
      };

      // Capture user information
      const user = ctx.state.user;
      ctx.state.auditUserInfo = user ? {
        id: user.id,
        email: user.email,
        role: user.role?.name || user.role?.code,
      } : null;

      // Get IP address
      const ipAddress = ctx.get('x-forwarded-for') || 
                       ctx.get('x-real-ip') || 
                       ctx.ip || 
                       ctx.request.ip;
      ctx.state.auditIpAddress = ipAddress;

      try {
        await next();
      } catch (error) {
        ctx.state.auditError = {
          message: error.message,
          stack: error.stack,
        };
        throw error;
      } finally {
        // Create audit log entry asynchronously
        setImmediate(async () => {
          try {
            await createAuditLogEntry(ctx, strapi);
          } catch (error) {
            strapi.log.error('Failed to create audit log entry:', error);
          }
        });
      }
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    strapi.log.info('Audit logging middleware has been registered');
  },

  /**
   * An asynchronous destroy function that runs before
   * your application gets shut down.
   *
   * This gives you an opportunity to gracefully stop services you run.
   */
  destroy({ strapi }) {},
};

// Helper function to create audit log entries
async function createAuditLogEntry(ctx, strapi) {
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
                   ctx.body?.data?.id;

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
      ctx.body
    );
    auditData.previousValues = ctx.state.auditRequestData?.body;
    auditData.newValues = ctx.body?.data;
    auditData.metadata = {
      status: ctx.status,
      success: ctx.status < 400,
    };
  } else if (action === 'delete') {
    auditData.previousValues = ctx.body?.data;
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

  // Create the audit log entry using Strapi's entity service
  try {
    await strapi.entityService.create('api::audit-log.audit-log', {
      data: auditData,
    });
  } catch (error) {
    strapi.log.error('Failed to create audit log:', error);
  }
}

// Helper functions
function getContentTypeFromPath(path) {
  const match = path.match(/^\/api\/([^\/\?]+)/);
  return match ? match[1] : null;
}

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

function getContentIdFromPath(path) {
  const match = path.match(/^\/api\/[^\/\?]+\/([^\/\?]+)/);
  return match ? match[1] : null;
}

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
