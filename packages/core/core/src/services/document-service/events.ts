import { UID, Utils, Modules, Core } from '@strapi/types';
import { sanitize } from '@strapi/utils';

import { getDeepPopulate } from './utils/populate';

const EVENTS = {
  ENTRY_CREATE: 'entry.create',
  ENTRY_UPDATE: 'entry.update',
  ENTRY_DELETE: 'entry.delete',
  ENTRY_PUBLISH: 'entry.publish',
  ENTRY_UNPUBLISH: 'entry.unpublish',
  ENTRY_DRAFT_DISCARD: 'entry.draft-discard',
};

type EventName = Utils.Object.Values<typeof EVENTS>;

/**
 * Manager to trigger entry related events
 *
 * It will populate the entry if it is not a delete event.
 * So the event payload will contain the full entry.
 */
const createEventManager = (strapi: Core.Strapi, uid: UID.Schema) => {
  const populate = getDeepPopulate(uid, {});
  const model = strapi.getModel(uid);

  const emitEvent = async (eventName: EventName, entry: Modules.Documents.AnyDocument) => {
    // There is no need to populate the entry if it has been deleted
    let populatedEntry = entry;
    if (![EVENTS.ENTRY_DELETE, EVENTS.ENTRY_UNPUBLISH].includes(eventName)) {
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
      entry: sanitizedEntry,
    });
  };

  return {
    /**
     * strapi.db.query might reuse the transaction used in the doc service request,
     * so this is executed after that transaction is committed.
     */
    emitEvent(eventName: EventName, entry: Modules.Documents.AnyDocument) {
      strapi.db.transaction(({ onCommit }) => {
        onCommit(() => emitEvent(eventName, entry));
      });
    },
  };
};

export { createEventManager };
