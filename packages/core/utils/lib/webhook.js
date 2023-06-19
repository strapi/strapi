'use strict';

const webhookEvents = {
  ENTRY_CREATE: 'entry.create',
  ENTRY_UPDATE: 'entry.update',
  ENTRY_DELETE: 'entry.delete',
  ENTRY_PUBLISH: 'entry.publish',
  ENTRY_UNPUBLISH: 'entry.unpublish',
  MEDIA_CREATE: 'media.create',
  MEDIA_UPDATE: 'media.update',
  MEDIA_DELETE: 'media.delete',
};

/**
 * TODO V5: remove this file
 * @deprecated
 */
const deprecatedWebhookEvents = new Proxy(webhookEvents, {
  get(target, prop) {
    console.warn(
      '[deprecated] @strapi/utils/webhook will no longer exist in the next major release of Strapi. ' +
        'Instead, the webhookEvents object can be retrieved from strapi.webhookStore.allowedEvents'
    );
    return target[prop];
  },
});

module.exports = {
  webhookEvents: deprecatedWebhookEvents,
};
