const EVENT_NAMES = new Set(['entry.create', 'entry.update', 'entry.delete']);

export default async ({ strapi }: { strapi: any }) => {
  // Register RBAC action for admin
  await strapi
    .service('admin::permission')
    .actionProvider.registerMany([
      {
        section: 'plugins',
        displayName: 'Read audit logs',
        uid: 'read',
        pluginName: 'audit-logs',
      },
      {
        section: 'settings',
        displayName: 'Access the audit logs page',
        uid: 'admin::audit-logs.read',
        pluginName: 'audit-logs',
        category: 'audit-logs',
      },
    ]);

  // Subscribe to event hub to capture CRUD events
  strapi.eventHub.subscribe(async (eventName: string, payload: any) => {
    try {
      const pluginCfg = strapi.config.get('plugin::audit-logs');
      const enabled = pluginCfg?.enabled !== false;
      if (!enabled) return;

      if (!EVENT_NAMES.has(eventName)) return;

      const exclude: string[] = pluginCfg?.excludeContentTypes || [];
      const uid: string | undefined = payload?.uid;
      if (!uid || exclude.includes(uid)) return;

      const ctx = strapi.requestContext.get();
      const user = ctx?.state?.user;
      const routeType = ctx?.state?.route?.info?.type;

      // Only log content-api initiated changes per requirement
      if (routeType && routeType !== 'content-api') return;

      const action = eventName.split('.')[1];
      const contentType = payload?.model ?? uid;
      const entry = payload?.entry ?? null;

      // Compute changed fields for updates (best effort: diff current payload)
      let changedFields: string[] | null = null;
      if (action === 'update' && entry && payload?.previous) {
        const prev = payload.previous;
        changedFields = Object.keys(entry).filter((k) => (entry as any)[k] !== (prev as any)[k]);
      }

      await strapi.db.query('plugin::audit-logs.audit-log').create({
        data: {
          contentType,
          recordId: (entry as any)?.id ?? payload?.entryId ?? null,
          action,
          userId: user?.id ?? null,
          userType: routeType || null,
          payload: action === 'delete' ? payload?.entry ?? null : entry ?? null,
          changedFields,
          occurredAt: new Date(),
        },
      });
    } catch (err) {
      strapi.log.error(`[audit-logs] Failed to store audit log: ${(err as Error).message}`);
    }
  });
};


