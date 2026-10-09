import type { ContentType } from '../../../data';
import type { Constants, Extends, If, Intersect, StrictEqual } from '../../../utils';
import type * as UID from '../../../uid';
import type { Attribute } from '../..';

export type MediaTargetUID = 'plugin::upload.file';
export type MediaKind = 'images' | 'videos' | 'files' | 'audios';

export interface MediaProperties<
  TKind extends MediaKind | undefined = undefined,
  TMultiple extends Constants.BooleanValue = Constants.False,
> {
  allowedTypes?: TKind | TKind[];
  multiple?: TMultiple;
}

/**
 * Represents a media Strapi attribute along with its options
 */
export type Media<
  TKind extends MediaKind | undefined = undefined,
  TMultiple extends Constants.BooleanValue = Constants.False,
> = Intersect<
  [
    Attribute.OfType<'media'>,
    // Properties
    MediaProperties<TKind, TMultiple>,
    // Options
    Attribute.ConfigurableOption,
    Attribute.RequiredOption,
    Attribute.PrivateOption,
    Attribute.WritableOption,
    Attribute.VisibleOption,
  ]
>;

/**
 * A file document from the upload plugin, as returned when a media attribute is populated.
 *
 * Falls back to the generic content-type document when the upload file UID isn't part of the registry.
 */
export type MediaFile = If<
  Extends<MediaTargetUID, UID.ContentType>,
  ContentType<Extract<MediaTargetUID, UID.ContentType>>,
  ContentType
>;

export type MediaValue<TMultiple extends Constants.BooleanValue = Constants.False> = If<
  // Generic media attributes (see AnyAttribute) don't know their plurality.
  // Keep `any` there so values of generic documents don't change.
  StrictEqual<TMultiple, Constants.BooleanValue>,
  any,
  If<TMultiple, MediaFile[], MediaFile>
>;

export type GetMediaValue<TAttribute extends Attribute.Attribute> =
  TAttribute extends Media<
    // The file shape doesn't depend on the media kind
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    infer _TKind,
    infer TMultiple
  >
    ? MediaValue<TMultiple>
    : never;

export type MediaTarget<TAttribute extends Attribute.Attribute> =
  TAttribute extends Media<MediaKind | undefined, Constants.BooleanValue> ? MediaTargetUID : never;
