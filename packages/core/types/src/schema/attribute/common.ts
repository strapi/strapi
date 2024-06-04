import type * as UID from '../../uid';
import type { Attribute } from '..';

/**
 * Represents any kind of attribute.
 *
 * A polymorphic type capturing a categorized set of various Attribute types, set by the attribute specific `type` key.
 *
 * It provides abstraction for the multitude of attributes available for handling different kinds of data, each of which can have its own options and properties.
 *
 * These are typically consumed by modules that need a way to handle any type of attribute in a unified manner.
 */
export type AnyAttribute =
  | Attribute.BigInteger
  | Attribute.Boolean
  | Attribute.Blocks
  | Attribute.Component<UID.Component, boolean>
  | Attribute.DateTime
  | Attribute.Date
  | Attribute.Decimal
  | Attribute.DynamicZone
  | Attribute.Email
  | Attribute.Enumeration<string[]>
  | Attribute.Float
  | Attribute.Integer
  | Attribute.JSON
  | Attribute.Media<Attribute.MediaKind | undefined, boolean>
  | Attribute.Password
  | Attribute.Relation
  | Attribute.RichText
  | Attribute.String
  | Attribute.Text
  | Attribute.Time
  | Attribute.Timestamp
  | Attribute.UID;
