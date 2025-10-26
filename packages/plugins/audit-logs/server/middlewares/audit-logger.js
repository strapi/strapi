'use strict';

const { isEmpty } = require('lodash/fp');

const createAuditLogger = ({ strapi }) => ({
  initialize() {
    return async (ctx, next) => {
      // Skip if audit logging is disabled
      if (!strapi.config.get('plugin.audit-logs.enabled')) {
        return next();
      }

      // Only process content API requests
      if (!ctx.url.startsWith('/api/')) {
        return next();
      }

      const startTime = Date.now();
      const originalBody = { ...ctx.request.body };
      
      try {
        // Store pre-operation state for updates/deletes
        if (['PUT', 'PATCH', 'DELETE'].includes(ctx.method)) {
          ctx.state.auditLog = {
            previousState: await getPreviousState(ctx, strapi)
          };
        }

        await next();

        // Only log successful operations
        if (ctx.status >= 200 && ctx.status < 300) {
          const contentType = extractContentType(ctx);
          
          // Skip excluded content types
          if (isContentTypeExcluded(contentType, strapi)) {
            return;
          }

          const entry = await createAuditEntry({
            ctx,
            originalBody,
            contentType,
            strapi,
            duration: Date.now() - startTime
          });

          if (entry) {
            await strapi.plugin('audit-logs').service('audit-log').create({
              data: entry
            });
          }
        }
      } catch (error) {
        strapi.log.error('Audit logging failed:', error);
        // Don't block the request if audit logging fails
      }
    };
  }
});

const extractContentType = (ctx) => {
  const urlParts = ctx.url.split('/');
  return urlParts[2]; // /api/[content-type]/...
};

const isContentTypeExcluded = (contentType, strapi) => {
  const excludedTypes = strapi.config.get('plugin.audit-logs.excludeContentTypes', []);
  return excludedTypes.includes(contentType);
};

const getPreviousState = async (ctx, strapi) => {
  const id = ctx.params.id;
  if (!id) return null;

  const contentType = extractContentType(ctx);
  const model = strapi.contentTypes[`api::${contentType}.${contentType}`];
  
  if (!model) return null;

  try {
    return await strapi.entityService.findOne(model.uid, id);
  } catch (e) {
    return null;
  }
};

const createAuditEntry = async ({ ctx, originalBody, contentType, strapi, duration }) => {
  const action = getAction(ctx.method);
  if (!action) return null;

  const user = ctx.state.user;
  const recordId = ctx.params.id || ctx.response.body?.data?.id;

  return {
    content_type: contentType,
    record_id: String(recordId),
    action,
    user_id: user?.id,
    user_email: user?.email,
    changes: computeChanges(action, ctx.state.auditLog?.previousState, ctx.response.body?.data),
    payload: getPayload(action, originalBody, ctx.response.body?.data),
    metadata: {
      ip: ctx.request.ip,
      userAgent: ctx.request.headers['user-agent'],
      timestamp: new Date().toISOString(),
      duration
    }
  };
};

const getAction = (method) => {
  switch (method) {
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return null;
  }
};

const computeChanges = (action, previous, current) => {
  if (action === 'create' || action === 'delete') return null;
  if (!previous || !current) return null;

  const changes = {};
  Object.keys(current).forEach(key => {
    if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
      changes[key] = {
        previous: previous[key],
        current: current[key]
      };
    }
  });

  return isEmpty(changes) ? null : changes;
};

const getPayload = (action, original, result) => {
  switch (action) {
    case 'create': return result;
    case 'delete': return original;
    default: return null;
  }
};

module.exports = createAuditLogger;
