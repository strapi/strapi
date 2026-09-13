import type { And, Constants, Extends, If, Intersect } from '../../../utils';
import type { Attribute } from '../..';
import type { ContentType } from '../../../data';
import type * as UID from '../../../uid';

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
 * Whether `plugin::upload.file` is actually present in the extended content-type registry.
 *
 * `Constants.AreSchemaRegistriesExtended` alone isn't enough: it's true as soon as *either*
 * the component or the content-type registry has been extended, which doesn't guarantee the
 * upload file content-type itself was registered (e.g. component-only augmentation, or a
 * selective/partial content-type registry that omits it).
 */
export type IsMediaTargetRegistered = Extends<MediaTargetUID, UID.ContentType>;

/**
 * The shape of a resolved media value.
 *
 * Uses the file schema's full attribute set (same as any other relation target, via
 * {@link ContentType}) rather than a restricted subset, so nested upload relations
 * (e.g. `folder`, `related`) stay accessible on populated media - consistent with how
 * relation attributes are resolved everywhere else and with what the query/populate types
 * already accept.
 *
 * `isUrlSigned` is added separately since it's runtime-only metadata (set by the upload
 * middleware for private providers) and isn't part of the file schema's attributes.
 *
 * Only resolved once the content-type registry is extended AND `plugin::upload.file` is part
 * of it (i.e. a project's generated types are loaded). Outside of that (e.g. this package's own
 * framework-internal, schema-agnostic code, or a component-only/partial registry), falls back
 * to `any` - the same escape hatch {@link Attribute.Value}'s other branches rely on in that
 * context.
 */
export type MediaAttributeValue = If<
  And<Constants.IsContentTypeRegistryExtended, IsMediaTargetRegistered>,
  ContentType<MediaTargetUID> & { isUrlSigned?: boolean },
  any
>;

export type MediaValue<TMultiple extends Constants.BooleanValue = Constants.False> =
  TMultiple extends Constants.True
    ? MediaAttributeValue[]
    : TMultiple extends Constants.False
      ? MediaAttributeValue
      : MediaAttributeValue[] | MediaAttributeValue;

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
