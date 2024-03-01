import type { UID } from '../../public';
import type { Attribute } from '../../schema';

// TODO: [TS2] Where to move this? Common doesn't really make sense :/
// Any Attribute
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
