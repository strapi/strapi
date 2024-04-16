import { curry } from 'lodash/fp';

import { UID, Schema, Utils, Core } from '@strapi/types';
import { sanitize } from '@strapi/utils';

import { getDeepPopulate } from './utils/populate';

const ALLOWED_WEBHOOK_EVENTS = {
  ENTRY_CREATE: 'entry.create',
  ENTRY_UPDATE: 'entry.update',
  ENTRY_DELETE: 'entry.delete',
  ENTRY_PUBLISH: 'entry.publish',
  ENTRY_UNPUBLISH: 'entry.unpublish',
  ENTRY_DRAFT_DISCARD: 'entry.draft-discard',
};

type WebhookEvent = Utils.Object.Values<typeof ALLOWED_WEBHOOK_EVENTS>;

const sanitizeEntry = async (
  model: Schema.ContentType<any> | Schema.Component<any>,
  entry: any
) => {
  return sanitize.sanitizers.defaultSanitizeOutput(
    {
      schema: model,
      getModel(uid) {
        return strapi.getModel(uid as UID.Schema);
      },
    },
    entry
  );
};

/**
 * Registers the content events that will be emitted using the document service.
 */
const registerEntryWebhooks = (strapi: Core.Strapi) => {
  Object.entries(ALLOWED_WEBHOOK_EVENTS).forEach(([key, value]) => {
    strapi.get('webhookStore').addAllowedEvent(key, value);
  });
};

/**
 * Triggers a webhook event.
 *
 * It will populate the entry if it is not a delete event.
 * So the webhook payload will contain the full entry.
 */
const emitWebhook = async (
  uid: UID.Schema,
  eventName: WebhookEvent,
  entry: { id: number | string; [key: string]: any }
) => {
  const populate = getDeepPopulate(uid, {});
  const model = strapi.getModel(uid);

  const emitEvent = async () => {
    // There is no need to populate the entry if it has been deleted
    let populatedEntry = entry;
    if (eventName !== 'entry.delete') {
      populatedEntry = await strapi.db.query(uid).findOne({ where: { id: entry.id }, populate });
    }

    const sanitizedEntry = await sanitizeEntry(model, populatedEntry);

    await strapi.eventHub.emit(eventName, {
      model: model.modelName,
      uid: model.uid,
      entry: sanitizedEntry,
    });
  };

  /**
   * strapi.db.query might reuse the transaction used in the doc service request,
   * so this is executed after that transaction is committed.
   */
  strapi.db.transaction(async ({ onCommit }) => onCommit(emitEvent));
};

const curriedEmitWebhook = curry(emitWebhook);

export { registerEntryWebhooks, curriedEmitWebhook as emitWebhook };
