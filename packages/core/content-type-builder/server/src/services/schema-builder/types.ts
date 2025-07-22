import type { Schema } from '@strapi/types';

/**
 * Internal relation attribute type that includes the dominant property
 * used during schema building process
 */
export type InternalRelationAttribute = Schema.Attribute.Relation & {
  dominant?: boolean;
  target: string;
  targetAttribute?: string;
  relation: Schema.Attribute.RelationKind.Any;
  inversedBy?: string;
  mappedBy?: string;
  private?: boolean;
  pluginOptions?: object;
  conditions?: {
    visible: Record<string, any>;
  };
};

/**
 * Internal attribute type that can be any attribute or a relation with dominant property
 */
export type InternalAttribute =
  | Exclude<Schema.Attribute.AnyAttribute, Schema.Attribute.Relation>
  | InternalRelationAttribute;
