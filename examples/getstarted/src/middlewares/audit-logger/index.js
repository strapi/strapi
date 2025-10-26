
'use strict';

module.exports = (config, { strapi }) => {
  function resolveUidFromSegment(segment) {
    if (!segment) return null;
    const keys = Object.keys(strapi.contentTypes || {});
    const exact = keys.find((k) => k.endsWith(`.${segment}`));
    if (exact) return exact;
    const partial = keys.find((k) => k.includes(`::${segment}`) || k.includes(`.${segment}`));
    return partial || null;
  }

  function computeDiff(before, after) {
    if (!before && after) return { added: after };
    if (!after && before) return { removed: before };
    const diff = { changed: {}, added: {}, removed: {} };
    const b = before || {};
    const a = after || {};
    const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
    for (const k of keys) {
      try {
        const bv = b[k];
        const av = a[k];
        const bvStr = JSON.stringify(bv);
        const avStr = JSON.stringify(av);
        if (bvStr !== avStr) {
          if (bv === undefined) diff.added[k] = av;
          else if (av === undefined) diff.removed[k] = bv;
          else diff.changed[k] = { before: bv, after: av };
        }
      } catch (e) {
        if (b[k] !== a[k]) diff.changed[k] = { before: b[k], after: a[k] };
      }
    }
    return diff;
  }

  return async (ctx, next) => {
    try {
      if (!ctx.request || !ctx.request.path) return await next();
      const path = ctx.request.path;
      if (!path.startsWith('/api/')) return await next();
      const auditConfig =
        (strapi.config && (strapi.config.get && (strapi.config.get('auditLog') || strapi.config.get('plugin.auditLog')))) ||
        config ||
        {};
      const enabled = typeof auditConfig.enabled === 'boolean' ? auditConfig.enabled : true;
      if (!enabled) return await next();

      const parts = path.split('/').filter(Boolean);
      if (parts.length < 2) return await next();
      const contentSegment = parts[1]; 
      const excluded = auditConfig.excludeContentTypes || [];
      if (excluded.includes(contentSegment)) return await next();
      const resolvedUidForExclude = resolveUidFromSegment(contentSegment);
      if (resolvedUidForExclude && excluded.includes(resolvedUidForExclude)) return await next();

      const method = (ctx.request.method || '').toUpperCase();

      const resolvedUid = resolveUidFromSegment(contentSegment);

      let before = null;
      if (['PUT', 'PATCH', 'DELETE'].includes(method) && resolvedUid) {
        const id = (ctx.params && ctx.params.id) || parts[2];
        if (id) {
          try {
            before = await strapi.entityService.findOne(resolvedUid, id, { populate: true });
          } catch (e) {
            strapi.log.debug && strapi.log.debug('audit-logger: failed to fetch before-state', e);
          }
        }
      }

      await next();

      try {
        const user = ctx.state && ctx.state.user ? ctx.state.user : null;
        const extractEntityFromCtx = (ctxObj) => {
          const body = ctxObj && (ctxObj.body || ctxObj.response?.body || ctxObj.response);
          if (!body) return null;
          if (body.data) return body.data;
          return body;
        };
        if (method === 'POST') {
          const created = extractEntityFromCtx(ctx);
          const recordId = created && (created.id || (created.data && created.data.id)) ? (created.id || created.data.id) : null;
          const log = {
            contentType: contentSegment,
            recordId,
            action: 'create',
            timestamp: new Date(),
            user: user ? { id: user.id, username: user.username || user.email } : null,
            payload: created,
          };
          if (resolvedUid) {
            await strapi.entityService.create('api::audit-log.audit-log', { data: log });
          }
        }
        if (['PUT', 'PATCH'].includes(method)) {
          const id = (ctx.params && ctx.params.id) || parts[2];
          const after = extractEntityFromCtx(ctx);
          const diff = computeDiff(before, after);
          const log = {
            contentType: contentSegment,
            recordId: id || (after && (after.id || (after.data && after.data.id))) || null,
            action: 'update',
            timestamp: new Date(),
            user: user ? { id: user.id, username: user.username || user.email } : null,
            diff,
            payload: after,
          };
          if (resolvedUid) {
            await strapi.entityService.create('api::audit-log.audit-log', { data: log });
          }
        }
        if (method === 'DELETE') {
          const id = (ctx.params && ctx.params.id) || parts[2];
          const log = {
            contentType: contentSegment,
            recordId: id || (before && before.id) || null,
            action: 'delete',
            timestamp: new Date(),
            user: user ? { id: user.id, username: user.username || user.email } : null,
            payload: before,
          };
          if (resolvedUid) {
            await strapi.entityService.create('api::audit-log.audit-log', { data: log });
          }
        }
      } catch (err) {
        strapi.log.error && strapi.log.error('audit-logger: failed to create audit log', err);
      }
    } catch (outerErr) {
      strapi.log.error && strapi.log.error('audit-logger middleware unexpected error', outerErr);
      try {
      } catch (e) {
      }
      return;
    }
  };
};
