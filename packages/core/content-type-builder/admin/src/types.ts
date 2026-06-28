import type { Schema, Struct, UID } from '@strapi/types';
import type { PrimitiveType } from 'react-intl';

export type IntlLabel = {
  id: string;
  defaultMessage: string;
  values?: Record<string, PrimitiveType>;
};

export type FormChange<TValue = unknown, TType extends string = string> = {
  target: {
    name: string;
    value?: TValue;
    type?: TType;
  };
};

export type FormChangeHandler<TValue = unknown, TType extends string = string> = (
  value: FormChange<TValue, TType>
) => void;

export type DifferentAttributesKind = 'Populatable' | 'NonPopulatable' | 'Any';

export type Status = 'UNCHANGED' | 'CHANGED' | 'REMOVED' | 'NEW';

export type AttributeConditionValue = string | number | boolean;

export type AttributeConditionRule = [{ var: string }, AttributeConditionValue];

export type AttributeConditions = {
  visible?: Record<string, AttributeConditionRule>;
};

export type Base = {
  name: string;
  status?: Status;
  customField?: string;
  conditions?: AttributeConditions;
};

export type Relation = Base & {
  type: 'relation';
  relation: Schema.Attribute.RelationKind.Any;
  target: string;
  targetAttribute?: string | null;
  configurable?: boolean;
  private?: boolean;
  pluginOptions?: Record<string, unknown>;
};

export type Media = Base & {
  type: 'media';
  multiple?: boolean;
  required?: boolean;
  configurable?: boolean;
  private?: boolean;
  allowedTypes?: string[];
  pluginOptions?: Record<string, unknown>;
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
};

export type ContentType = Omit<Struct.ContentTypeSchema, 'attributes'> & {
  plugin?: string;
  visible: boolean;
  status: Status;
  restrictRelationsTo: Schema.Attribute.RelationKind.Any[] | null;
  attributes: Array<AnyAttribute>;
};

export type Components = Record<string, Component>;

export type ContentTypes = Record<string, ContentType>;
