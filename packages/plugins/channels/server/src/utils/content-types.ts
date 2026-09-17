import type { Core, Schema } from '@strapi/types';

interface ChannelsAttributeOptions {
  overridable?: boolean;
  visibleIn?: string[];
}

type AttributeWithOptions = { pluginOptions?: { channels?: ChannelsAttributeOptions } };

/**
 * Channels are strictly opt-in, per content type:
 *
 *   "pluginOptions": { "channels": { "enabled": true } }
 *
 * and only on user content types — plugin content types (upload files, admin
 * users, i18n locales, …) belong to the platform, not to a delivery channel.
 */
export const isChannelsEnabledContentType = (model: unknown): boolean => {
  const ct = model as
    | { uid?: string; pluginOptions?: { channels?: { enabled?: boolean } } }
    | undefined;
  if (!ct?.uid?.startsWith('api::')) {
    return false;
  }
  return ct.pluginOptions?.channels?.enabled === true;
};

export const getChannelsEnabledContentTypes = (strapi: Core.Strapi): Schema.ContentType[] =>
  Object.values(strapi.contentTypes).filter((ct) => isChannelsEnabledContentType(ct));

const attributeChannelOptions = (
  model: Schema.ContentType,
  name: string
): ChannelsAttributeOptions =>
  (model.attributes?.[name] as AttributeWithOptions | undefined)?.pluginOptions?.channels ?? {};

/**
 * Attributes whose value may differ per channel:
 *
 *   "pluginOptions": { "channels": { "overridable": true } }
 *
 * Everything else is identical on every channel and rejected when a channel
 * write tries to change it.
 */
export const getOverridableAttributes = (model: Schema.ContentType): string[] =>
  Object.keys(model.attributes ?? {}).filter(
    (name) => attributeChannelOptions(model, name).overridable === true
  );

/**
 * Attributes hidden on the given channel:
 *
 *   "pluginOptions": { "channels": { "visibleIn": ["desktop"] } }
 *
 * An empty (or missing) `visibleIn` means visible everywhere. The base view
 * (`channelSlug === null` / `default`) always sees everything.
 */
export const getHiddenAttributes = (model: Schema.ContentType, channelSlug: string): string[] =>
  Object.keys(model.attributes ?? {}).filter((name) => {
    const { visibleIn } = attributeChannelOptions(model, name);
    return Array.isArray(visibleIn) && visibleIn.length > 0 && !visibleIn.includes(channelSlug);
  });

/**
 * Content-type-level channel binding:
 *
 *   "pluginOptions": { "channels": { "availableIn": ["mobile", "tablet"] } }
 *
 * Entries carry variants only in the listed channels; on any other channel
 * they serve the base content and refuse overrides. Empty/missing = every
 * channel.
 */
export const isAvailableOnChannel = (model: unknown, channelSlug: string): boolean => {
  const availableIn = (model as { pluginOptions?: { channels?: { availableIn?: string[] } } })
    ?.pluginOptions?.channels?.availableIn;
  if (!Array.isArray(availableIn) || availableIn.length === 0) {
    return true;
  }
  return availableIn.includes(channelSlug);
};

export const isLocalizedContentType = (model: unknown): boolean =>
  (model as { pluginOptions?: { i18n?: { localized?: boolean } } })?.pluginOptions?.i18n
    ?.localized === true;

export const hasDraftAndPublish = (model: unknown): boolean =>
  (model as { options?: { draftAndPublish?: boolean } })?.options?.draftAndPublish === true;
