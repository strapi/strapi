'use strict';

const _ = require('lodash');

module.exports = ({ strapi }) => ({
  async createEntry({ contentType, recordId, action, user, payload, changed, context }) {
    const config = strapi.config.get('plugin.audit-log', { enabled: true, excludeContentTypes: [] });
    if (!config.enabled) return;
    if ((config.excludeContentTypes || []).includes(contentType)) return;

    try {
      const timestamp = new Date().toISOString();
      const userId = user?.id ?? null;
      const userSnapshot = user
        ? _.pick(user, ['id', 'username', 'email', 'firstname', 'lastname'])
        : null;

      let diff = null;
      if (action === 'create') diff = payload;
      else if (action === 'delete') diff = payload;
      else if (action === 'update') {
        if (changed) diff = changed;
        else diff = payload;
      }

      const maxSize = config.maxDiffSize || 10240;
      let finalDiff = diff;
      try {
        const diffString = JSON.stringify(diff || {});
        if (diffString.length > maxSize) {
          finalDiff = JSON.parse(diffString.slice(0, maxSize));
        }
      } catch (e) {
        finalDiff = null;
      }

      const entry = {
        contentType,
        recordId: recordId?.toString?.() ?? null,
        action,
        timestamp,
        userId,
        user: userSnapshot,
        diff: finalDiff,
        meta: {
          source: context?.request?.method ? 'content-api' : 'internal',
          path: context?.request?.path ?? null
        }
      };

      await strapi.entityService.create('plugin::audit-log.audit-log', { data: entry });
    } catch (err) {
      strapi.log.error('[audit-log] createEntry error', err);
    }
  }
});
