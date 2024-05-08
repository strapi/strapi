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

// TODO: [TS2] Introduce a real type for the media values, remove any
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

export type MediaTarget<TAttribute extends Attribute.Attribute> = TAttribute extends Media
  ? MediaTargetUID
  : never;
