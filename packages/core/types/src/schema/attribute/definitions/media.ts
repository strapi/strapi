import type { Constants, If, Intersect } from '../../../utils';
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

export type MediaValue<TMultiple extends Constants.BooleanValue = Constants.False> = If<
  TMultiple,
  any[],
  any
>;

export type GetMediaValue<TAttribute extends Attribute.Attribute> =
  TAttribute extends Media<
    // Unused as long as the media value is any
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    infer _TKind,
    infer TMultiple
  >
    ? MediaValue<TMultiple>
    : never;

/**
 * Represents a single image format produced by the upload provider (e.g. thumbnail, small, medium, large).
 */
export interface MediaFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  sizeInBytes: number;
  path: string | null;
  url: string;
}

/**
 * Represents the resolved shape of a media (upload file) value as returned by Strapi.
 *
 * Mirrors the public attributes of the `plugin::upload.file` content-type so that
 * consumers can access typed fields (`url`, `name`, `mime`, etc.) on media values.
 *
 * Fields are optional because they are not all guaranteed to be present in every
 * upload provider response (e.g. `width`/`height` only exist for images, `formats`
 * is only set when image processing has run). An open index signature is included
 * so the shape remains compatible with extended provider metadata and downstream
 * consumers that augment the file payload.
 */
export interface MediaData {
  id?: number;
  documentId?: string;
  name?: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  formats?: Record<string, MediaFormat> | null;
  hash?: string;
  ext?: string | null;
  mime?: string;
  size?: number;
  url?: string;
  previewUrl?: string | null;
  provider?: string;
  provider_metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
  [key: string]: unknown;
}

/**
 * Typed counterpart of {@link MediaValue}. Use this when you want the resolved
 * media shape ({@link MediaData}) instead of the permissive `any`-based
 * {@link MediaValue}, e.g. when extracting typed values from a schema.
 */
export type MediaDataValue<TMultiple extends Constants.BooleanValue = Constants.False> = If<
  TMultiple,
  MediaData[],
  MediaData
>;

/**
 * Typed counterpart of {@link GetMediaValue} — resolves a media attribute to
 * its {@link MediaData}-based value type (single or array, depending on the
 * attribute's `multiple` option).
 */
export type GetMediaData<TAttribute extends Attribute.Attribute> =
  TAttribute extends Media<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    infer _TKind,
    infer TMultiple
  >
    ? MediaDataValue<TMultiple>
    : never;

export type MediaTarget<TAttribute extends Attribute.Attribute> =
  TAttribute extends Media<MediaKind | undefined, Constants.BooleanValue> ? MediaTargetUID : never;
