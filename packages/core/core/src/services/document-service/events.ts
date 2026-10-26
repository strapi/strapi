import type { UID, Utils, Modules, Core } from '@strapi/types';
import { sanitize } from '@strapi/utils';

import { getDeepPopulate } from './utils/populate';

const EVENTS = {
  ENTRY_CREATE: 'entry.create',
  ENTRY_UPDATE: 'entry.update',
  ENTRY_DELETE: 'entry.delete',
  ENTRY_PUBLISH: 'entry.publish',
  ENTRY_UNPUBLISH: 'entry.unpublish',
  ENTRY_DRAFT_DISCARD: 'entry.draft-discard',
} as const;

type EventName = Utils.Object.Values<typeof EVENTS>;

/**
 * Manager to trigger entry related events
 *
 * It will populate the entry if it is not a delete event.
 * So the event payload will contain the full entry.
 */
const createEventManager = (strapi: Core.Strapi, uid: UID.Schema) => {
  const model = strapi.getModel(uid);

  const populate = getDeepPopulate(uid, {});

  const emitEvent = async (eventName: EventName, entry: Modules.Documents.AnyDocument) => {
    // Reading the entry again with a deep populate is the expensive part of an event: skip it,
    // along with the sanitization, when nothing would receive the event.
    if (!strapi.eventHub.hasListeners(eventName)) {
      return;
    }

    // There is no need to populate the entry if it has been deleted
    let populatedEntry = entry;
    if (eventName !== EVENTS.ENTRY_DELETE && eventName !== EVENTS.ENTRY_UNPUBLISH) {
      populatedEntry = await strapi.db.query(uid).findOne({ where: { id: entry.id }, populate });
    }

    const sanitizedEntry = await sanitize.sanitizers.defaultSanitizeOutput(
      {
        schema: model,
        getModel: (uid) => strapi.getModel(uid as UID.Schema),
      },
      populatedEntry
    );

    await strapi.eventHub.emit(eventName, {
      model: model.modelName,
      uid: model.uid,
      // The sanitized output of a document row keeps its `id` and `documentId`.
      // An entry deleted between the commit and this fetch may be emitted as `null`.
      entry: sanitizedEntry as Modules.Documents.AnyDocument,
    });
  };

  return {
    /**
     * strapi.db.query might reuse the transaction used in the doc service request,
     * so this is executed after that transaction is committed.
     */
    emitEvent(eventName: EventName, entry: Modules.Documents.AnyDocument) {
      strapi.db.transaction(({ onCommit }) => {
        // The transaction runner discards the callback result, so a failure here
        // (e.g. the re-read of the entry) would be an unhandled rejection.
        onCommit(() =>
          emitEvent(eventName, entry).catch((error) => {
            strapi.log.error(`Could not emit ${eventName} for ${uid}: ${error?.message ?? error}`);
          })
        );
      });
    },
  };
};

export { createEventManager };
