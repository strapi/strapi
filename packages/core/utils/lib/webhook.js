'use strict';

const webhookEvents = {
  /**
   * @type {'entry.create'}
   */
  ENTRY_CREATE: 'entry.create',
  /**
   * @type {'entry.update'}
   */
  ENTRY_UPDATE: 'entry.update',
  /**
   * @type {'entry.delete'}
   */
  ENTRY_DELETE: 'entry.delete',
  /**
   * @type {'entry.publish'}
   */
  ENTRY_PUBLISH: 'entry.publish',
  /**
   * @type {'entry.unpublish'}
   */
  ENTRY_UNPUBLISH: 'entry.unpublish',
  /**
   * @type {'media.create'}
   */
  MEDIA_CREATE: 'media.create',
  /**
   * @type {'media.update'}
   */
  MEDIA_UPDATE: 'media.update',
  /**
   * @type {'media.delete'}
   */
  MEDIA_DELETE: 'media.delete',
};

module.exports = {
  webhookEvents,
};
