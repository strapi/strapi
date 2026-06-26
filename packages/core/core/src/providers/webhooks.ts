import { defineProvider } from './provider';
import { createWebhookStore, webhookModel } from '../services/webhook-store';
import createWebhookRunner from '../services/webhook-runner';

// Holds the optional polling timer so it can be cleared on destroy.
let reloadTimer: NodeJS.Timeout | undefined;

export default defineProvider({
  init(strapi) {
    strapi.get('models').add(webhookModel);

    strapi.add('webhookStore', () => createWebhookStore({ db: strapi.db }));
    strapi.add('webhookRunner', () =>
      createWebhookRunner({
        eventHub: strapi.eventHub,
        logger: strapi.log,
        configuration: strapi.config.get('server.webhooks', {}),
        fetch: strapi.fetch,
      })
    );
  },
  async bootstrap(strapi) {
    const webhookStore = strapi.get('webhookStore');
    const webhookRunner = strapi.get('webhookRunner');

    const webhooks = await webhookStore.findWebhooks();
    if (!webhooks) {
      return;
    }

    for (const webhook of webhooks) {
      webhookRunner.add(webhook);
    }

    // The webhook registry lives in memory and is only mutated on the instance
    // that handled the admin create/update/delete request. In a clustered or
    // horizontally-scaled deployment, other instances keep a stale registry
    // until they restart (issue #22595). When `server.webhooks.reloadInterval`
    // (ms) is set, every instance periodically reloads the registry from the
    // database so configuration changes converge across the cluster.
    const reloadInterval = strapi.config.get('server.webhooks.reloadInterval', 0) as number;
    if (reloadInterval && reloadInterval > 0) {
      reloadTimer = setInterval(async () => {
        try {
          const freshWebhooks = await webhookStore.findWebhooks();
          webhookRunner.reload(freshWebhooks);
        } catch (error) {
          strapi.log.error('Failed to reload the webhook registry from the database');
          strapi.log.error(error);
        }
      }, reloadInterval);

      // Do not keep the process alive just for this timer.
      reloadTimer.unref?.();
    }
  },
  async destroy() {
    if (reloadTimer) {
      clearInterval(reloadTimer);
      reloadTimer = undefined;
    }
  },
});
