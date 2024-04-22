import { curry } from 'lodash/fp';

import { UID, Schema, Utils, Core, Modules } from '@strapi/types';
import { sanitize } from '@strapi/utils';

import { getDeepPopulate } from './utils/populate';

const ALLOWED_WEBHOOK_EVENTS = {
  DOCUMENT_CREATE: 'document.create',
  DOCUMENT_UPDATE: 'document.update',
  DOCUMENT_DELETE: 'document.delete',
  DOCUMENT_PUBLISH: 'document.publish',
  DOCUMENT_UNPUBLISH: 'document.unpublish',
  DOCUMENT_DRAFT_DISCARD: 'document.draft-discard',
};

type WebhookEvent = Utils.Object.Values<typeof ALLOWED_WEBHOOK_EVENTS>;

const sanitizeEntry = async (
  model: Schema.ContentType<any> | Schema.Component<any>,
  entry: Modules.Documents.AnyDocument
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

  // TODO: V6 Remove the legacy events
  Object.entries(ALLOWED_WEBHOOK_EVENTS).forEach(([key, value]) => {
    if (value.startsWith('document.')) {
      const legacyKey = key.replace('DOCUMENT_', 'ENTRY_');
      const legacyValue = value.replace('document.', 'entry.');
      strapi.get('webhookStore').addAllowedEvent(legacyKey, legacyValue);
    }
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
  entry: Modules.Documents.AnyDocument
) => {
  const populate = getDeepPopulate(uid, {});
  const model = strapi.getModel(uid);

  const emitEvent = async () => {
    // There is no need to populate the entry if it has been deleted
    let populatedEntry = entry;
    if (eventName !== 'document.delete' && eventName !== 'document.unpublish') {
      populatedEntry = await strapi.db.query(uid).findOne({ where: { id: entry.id }, populate });
    }

    const sanitizedEntry = await sanitizeEntry(model, populatedEntry);

    await strapi.eventHub.emit(eventName, {
      model: model.modelName,
      uid: model.uid,
      entry: sanitizedEntry,
    });

    // TODO: V6 Do not emit the 'entry.XXX' events
    if (eventName.startsWith('document.')) {
      // Also emit the legacy event "entry.XXX" for backward compatibility
      await strapi.eventHub.emit(eventName.replace('document.', 'entry.'), {
        model: model.modelName,
        uid: model.uid,
        entry: sanitizedEntry,
      });
    }
  };

  /**
   * strapi.db.query might reuse the transaction used in the doc service request,
   * so this is executed after that transaction is committed.
   */
  strapi.db.transaction(async ({ onCommit }) => onCommit(emitEvent));
};

const curriedEmitWebhook = curry(emitWebhook);

export { registerEntryWebhooks, curriedEmitWebhook as emitWebhook };
