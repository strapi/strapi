import type { Attribute, Common, Utils } from '@strapi/strapi';

export interface UIDOptions {
  separator?: string;
  lowercase?: boolean;
  decamelize?: boolean;
  customReplacements?: Array<[string, string]>;
  preserveLeadingUnderscore?: boolean;
}

export interface UIDProperties<
  TOrigin extends Common.UID.Schema,
  TTargetAttribute extends AllowedTargetAttributes<TOrigin>,
  TOptions extends UIDOptions = UIDOptions
> {
  targetField: TTargetAttribute;
  options: UIDOptions & TOptions;
}

export interface GenericUIDProperties<TOptions extends UIDOptions = UIDOptions> {
  targetField?: string;
  options: TOptions & UIDOptions;
}

export type UID<
  TOrigin extends Common.UID.Schema | undefined = undefined,
  TTargetAttribute extends AllowedTargetAttributes<TOrigin> = AllowedTargetAttributes<TOrigin>,
  TOptions extends UIDOptions = UIDOptions
> = Attribute.OfType<'uid'> &
  // Properties
  (TOrigin extends Common.UID.Schema
    ? UIDProperties<TOrigin, TTargetAttribute, TOptions>
    : GenericUIDProperties<TOptions>) &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<UIDValue> &
  Attribute.MinMaxLengthOption &
  Attribute.PrivateOption &
  Attribute.RequiredOption;

type AllowedTargetAttributes<TOrigin extends Common.UID.Schema | undefined> =
  TOrigin extends Common.UID.Schema
    ? Utils.Guard.Never<Attribute.GetKeysByType<TOrigin, 'string' | 'text'>, string>
    : never;

export type UIDValue = string;

export type GetUIDValue<TAttribute extends Attribute.Attribute> = TAttribute extends UID<
  infer _TOrigin,
  infer _TTargetAttribute
>
  ? UIDValue
  : never;
