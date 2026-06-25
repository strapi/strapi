import type { Schema, Struct, UID } from '@strapi/types';

export type IntlLabel = {
  id: string;
  defaultMessage: string;
  values?: Record<string, any>;
};

export type DifferentAttributesKind = 'Populatable' | 'NonPopulatable' | 'Any';

export type Status = 'UNCHANGED' | 'CHANGED' | 'REMOVED' | 'NEW';

type Schema = {
  modelType: Struct.ModelType;
  attributes: any[];
  [key: string]: any;
};

export type Base = {
  name: string;
  status?: Status;
  customField?: any;
  conditions?: {
    visible?: Record<string, any>;
  };
};

/**
 * A single attribute rename hop, recorded in the exact order the user performed
 * it so the server can replay it as a data-preserving migration. Because the CTB
 * forbids duplicate field names at any instant, the recorded sequence is always
 * collision-free (a swap is expressed through the user's own intermediate name).
 * Only renames of fields that already exist in the database are tracked — never
 * brand-new fields. Transient (admin only).
 */
export type RenameHop = {
  oldName: string;
  newName: string;
};

export type Relation = Base & {
  type: 'relation';
  relation: Schema.Attribute.RelationKind.Any;
  target: string;
  targetAttribute?: string | null;
  configurable?: boolean;
  private?: boolean;
  pluginOptions?: Record<string, any>;
};

export type Media = Base & {
  type: 'media';
  multiple?: boolean;
  required?: boolean;
  configurable?: boolean;
  private?: boolean;
  allowedTypes?: string[];
  pluginOptions?: Record<string, any>;
};

export type AnyAttribute = Base &
  (
    | Schema.Attribute.BigInteger
    | Schema.Attribute.Boolean
    | Schema.Attribute.Blocks
    | Schema.Attribute.Component<UID.Component, boolean>
    | Schema.Attribute.DateTime
    | Schema.Attribute.Date
    | Schema.Attribute.Decimal
    | Schema.Attribute.DynamicZone
    | Schema.Attribute.Email
    | Schema.Attribute.Enumeration<string[]>
    | Schema.Attribute.Float
    | Schema.Attribute.Integer
    | Schema.Attribute.JSON
    | Schema.Attribute.Password
    | Schema.Attribute.RichText
    | Schema.Attribute.String
    | Schema.Attribute.Text
    | Schema.Attribute.Time
    | Schema.Attribute.Timestamp
    | Schema.Attribute.UID
    /* The media & relation attributes have a different format in the CTB */
    | Media
    | Relation
  );

export type Component = Omit<Struct.ComponentSchema, 'attributes'> & {
  status: Status;
  attributes: Array<AnyAttribute>;
  renames?: RenameHop[];
};

export type ContentType = Omit<Struct.ContentTypeSchema, 'attributes'> & {
  plugin?: string;
  visible: boolean;
  status: Status;
  restrictRelationsTo: Schema.Attribute.RelationKind.Any[] | null;
  attributes: Array<AnyAttribute>;
  renames?: RenameHop[];
};

export type Components = Record<string, Component>;

export type ContentTypes = Record<string, ContentType>;
