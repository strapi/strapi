import type { Attribute, Common, Utils } from '@strapi/strapi';

export interface UIDOptions {
  separator?: string;
  lowercase?: boolean;
  decamelize?: boolean;
  customReplacements?: Array<[string, string]>;
  preserveLeadingUnderscore?: boolean;
}

export interface UIDProperties<
  // Own Schema Reference
  T extends Common.UID.Schema,
  // Target attribute
  U extends TargetAttributeByUID<T>,
  // UID options
  S extends UIDOptions = UIDOptions
> {
  targetField: U;
  options: UIDOptions & S;
}

export interface GenericUIDProperties<S extends UIDOptions = UIDOptions> {
  targetField?: string;
  options: UIDOptions & S;
}

export type UID<
  // Own Schema Reference
  T extends Common.UID.Schema | undefined = undefined,
  // Target attribute
  U extends TargetAttributeByUID<T> = TargetAttributeByUID<T>,
  // UID options
  S extends UIDOptions = UIDOptions
> = Attribute.OfType<'uid'> &
  // Properties
  (T extends Common.UID.Schema ? UIDProperties<T, U, S> : GenericUIDProperties<S>) &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<UIDValue> &
  Attribute.MinMaxLengthOption &
  Attribute.PrivateOption &
  Attribute.RequiredOption;

type TargetAttributeByUID<T extends Common.UID.Schema | undefined> = T extends Common.UID.Schema
  ? Utils.Guard.Never<Attribute.GetKeysByType<T, 'string' | 'text'>, string>
  : never;

export type UIDValue = string;

export type GetUIDValue<T extends Attribute.Attribute> = T extends UID<infer _U, infer _P>
  ? UIDValue
  : never;
