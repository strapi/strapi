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

  /**
   * Populates, sanitizes, and emits an event for the given entry.
   *
   * Population and sanitization are performed within the current
   * transaction context so the data is always visible.  The actual
   * event-hub emission is deferred until the transaction commits so
   * that webhook consumers always see fully committed data.
   *
   * Previously, the findOne re-fetch happened inside the onCommit
   * callback (i.e. after the transaction had committed).  On some
   * databases the newly-created row was not yet visible to the fresh
   * connection used by that query, causing publish webhooks to receive
   * a null entry.  See https://github.com/strapi/strapi/issues/25387
   */
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

    /**
     * Defer the actual emission until the enclosing transaction commits
     * so that webhook consumers always observe fully committed state.
     */
    strapi.db.transaction(({ onCommit }) => {
      onCommit(() =>
        strapi.eventHub.emit(eventName, {
          model: model.modelName,
          uid: model.uid,
          entry: sanitizedEntry,
        })
      );
    });
  };

  return {
    emitEvent,
  };
};

export { createEventManager };
