import type { Constants, If, Intersect } from '../../../utils';
import type { Attribute, NonPopulatableAttributeNames } from '../..';
import type { ContentType } from '../../../data';

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
 * The shape of a resolved media value.
 *
 * Restricted to the file schema's non-populatable (scalar) attributes: including its
 * `folder`/`related` relations would let the type recurse into arbitrary content types
 * (anything that itself has a media field), which blows up type-checking on real projects.
 *
 * Only resolved once the schema registries are extended (i.e. a project's generated types are
 * loaded). Outside of that (e.g. this package's own framework-internal, schema-agnostic code),
 * `plugin::upload.file` isn't a real registered schema, so this falls back to `any` - the same
 * escape hatch {@link Attribute.Value}'s other branches rely on in that context.
 */
export type MediaAttributeValue = If<
  Constants.AreSchemaRegistriesExtended,
  ContentType<MediaTargetUID, NonPopulatableAttributeNames<MediaTargetUID>>,
  any
>;

export type MediaValue<TMultiple extends Constants.BooleanValue = Constants.False> = If<
  TMultiple,
  MediaAttributeValue[],
  MediaAttributeValue
>;

export type GetMediaValue<TAttribute extends Attribute.Attribute> =
  TAttribute extends Media<
    // Unused as long as the resolved media value doesn't depend on the allowed kinds
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    infer _TKind,
    infer TMultiple
  >
    ? MediaValue<TMultiple>
    : never;

export type MediaTarget<TAttribute extends Attribute.Attribute> =
  TAttribute extends Media<MediaKind | undefined, Constants.BooleanValue> ? MediaTargetUID : never;
