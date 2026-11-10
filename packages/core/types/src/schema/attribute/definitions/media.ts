import type { IsStrict } from '../../../core/strictness';
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
 * A file of the upload plugin, as a populated media attribute holds it: the `plugin::upload.file`
 * document, or the generic content-type document when that UID is not registered.
 */
type MediaFile = If<
  Extends<MediaTargetUID, UID.ContentType>,
  ContentType<Extract<MediaTargetUID, UID.ContentType>>,
  ContentType
>;

/** A populated file: the upload file document with strict types, `any` without. */
type MediaFileValue = IsStrict extends false ? any : MediaFile;

/**
 * The value of a populated media attribute, an array of files when it is `multiple`. With strict
 * types, a file is the `plugin::upload.file` document, as a relation's value is its target's
 * document. Without strict types, a file is `any`. A media attribute whose plurality is unknown, such
 * as a generic attribute, is `any`.
 */
export type MediaValue<TMultiple extends Constants.BooleanValue = Constants.False> = If<
  StrictEqual<TMultiple, Constants.BooleanValue>,
  any,
  If<TMultiple, MediaFileValue[], MediaFileValue>
>;

export type GetMediaValue<TAttribute extends Attribute.Attribute> =
  TAttribute extends Media<
    // The file does not depend on the media kind
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    infer _TKind,
    infer TMultiple
  >
    ? MediaValue<TMultiple>
    : never;

export type MediaTarget<TAttribute extends Attribute.Attribute> =
  TAttribute extends Media<MediaKind | undefined, Constants.BooleanValue> ? MediaTargetUID : never;
