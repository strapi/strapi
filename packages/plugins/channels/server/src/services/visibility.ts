import type { Core, Schema } from '@strapi/types';
import { errors } from '@strapi/utils';

import { getHiddenAttributes, getOverridableAttributes } from '../utils';

const { ValidationError } = errors;

/**
 * Per-channel field visibility and writability, both derived from the schema:
 *
 *   - `pluginOptions.channels.visibleIn: string[]` — attribute hidden on every
 *     channel the list does not name (empty/missing = visible everywhere);
 *   - `pluginOptions.channels.overridable: true` — attribute value may differ
 *     per channel; everything else is identical on every channel.
 *
 * Hidden attributes are stripped from channel responses post-overlay (removal
 * only, so output sanitizers are unaffected). Writes are checked against the
 * attributes that actually CHANGED, never against the payload: the Content
 * Manager sends the full entity on save, and rejecting untouched attributes
 * would break every save made from a channel.
 */
const visibilityService = ({ strapi }: { strapi: Core.Strapi }) => {
  // The hidden set is schema-derived: memoise per (uid, channel slug).
  const hiddenCache = new Map<string, Set<string>>();

  const hiddenFor = (uid: string, channelSlug: string): Set<string> => {
    const key = `${uid}:${channelSlug}`;
    let hidden = hiddenCache.get(key);
    if (!hidden) {
      const model = strapi.getModel(uid as any) as Schema.ContentType;
      hidden = new Set(getHiddenAttributes(model, channelSlug));
      hiddenCache.set(key, hidden);
    }
    return hidden;
  };

  return {
    /** Removes the attributes hidden on `channelSlug` from a response document. */
    stripHidden<T extends Record<string, unknown>>(uid: string, doc: T, channelSlug: string): T {
      const hidden = hiddenFor(uid, channelSlug);
      if (hidden.size === 0) {
        return doc;
      }
      const out = { ...doc };
      for (const attribute of hidden) {
        delete out[attribute];
      }
      return out;
    },

    /**
     * Refuses a channel write that changes attributes the channel may not
     * touch: non-overridable ones, and ones hidden on that channel.
     */
    assertWritable(uid: string, changedAttributes: string[], channelSlug: string): void {
      const model = strapi.getModel(uid as any) as Schema.ContentType;
      const overridable = new Set(getOverridableAttributes(model));
      const hidden = hiddenFor(uid, channelSlug);

      const refused = changedAttributes.filter(
        (attribute) => !overridable.has(attribute) || hidden.has(attribute)
      );
      if (refused.length > 0) {
        throw new ValidationError(
          `These attributes cannot be changed on channel "${channelSlug}": ${refused.join(', ')}. ` +
            'Mark them as overridable (and visible on this channel) in the Content-Type Builder, ' +
            'or edit them on the default channel.'
        );
      }
    },

    /** Schema edits change the hidden sets — the CTB flushes through this. */
    clearCache() {
      hiddenCache.clear();
    },
  };
};

type VisibilityService = typeof visibilityService;

export default visibilityService;
export type { VisibilityService };
