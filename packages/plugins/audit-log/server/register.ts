import { Strapi } from '@strapi/strapi';
import type { Core } from '@strapi/types'; // Use 'type' import for Core

export interface AuditLogPluginConfig {
  enabled: boolean;
  excludeContentTypes: string[];
  kafka: {
    brokers: string[];
    topic: string;
  };
}

// Define AuditLogEvent directly with expected properties
export interface AuditLogEvent {
  action: Core.Event.Action; // Use Core.Event.Action for better type safety
  model: {
    uid: string;
    singularName: string;
    // Add other properties of model if needed
  };
  params: {
    data?: any;
    where?: { id?: string | number };
    // Add other properties of params if needed
  };
  result?: any; // The result of the operation
  // Add other properties of a Strapi lifecycle event if needed
}


export default ({ strapi }: { strapi: Strapi }) => {
  const config = strapi.config.get('plugin.audit-log') as AuditLogPluginConfig; // Cast config

  if (config?.enabled) {
    let beforeState: Record<string | number, any> = {}; // Use a more specific type for beforeState

    strapi.db.lifecycles.subscribe(async (event: AuditLogEvent) => { // Type the event
      const { action, model, params, result } = event;
      const { uid, singularName } = model;

      if (config.excludeContentTypes?.includes(uid)) {
        return;
      }

      if (action === 'beforeUpdate') {
        const recordId = params.where?.id;
        if (recordId) {
          beforeState[recordId] = await strapi.db.query(uid).findOne({ where: { id: recordId } });
        }
        return;
      }

      if (action === 'afterCreate' || action === 'afterUpdate' || action === 'afterDelete') {
        let payload = {};
        let recordId = params.where?.id || result?.id; // Use params.where for recordId if available

        if (action === 'afterUpdate') {
          payload = { before: beforeState[recordId], after: result };
          delete beforeState[recordId]; // Clean up temporary state
        } else if (action === 'afterCreate') {
          payload = { after: result };
        }

        let userId = null;
        const ctx = strapi.requestContext.get();
        if (ctx && ctx.state && ctx.state.user) {
          userId = ctx.state.user.id;
        }

        await strapi.plugin('audit-log').service('kafka').sendMessage({
          action: action.replace('after', '').toLowerCase(),
          contentType: singularName,
          recordId,
          userId,
          payload,
        });
      }
    });
  }

  strapi.admin.services.permission.actionProvider.register({
    uid: 'read',
    displayName: 'Read Audit Logs',
    pluginName: 'audit-log',
    section: 'plugins',
  });
};