import type { GetAttributesValues, RelationsType } from '@strapi/strapi';
import type { SchemaUID } from '@strapi/strapi/lib/types/utils';

export interface IMetadata {
  strapi?: {
    version?: string;

    plugins?: {
      name: string;
      version: string;
    }[];
  };

  createdAt?: string;
}

/**
 * Common TransferEngine format to represent a Strapi entity
 * @template T The schema UID this entity represents
 */
export interface IEntity<T extends SchemaUID | string> {
  /**
   * UID of the parent type (content-type, component, etc...)
   */
  type: T;

  /**
   * Reference of the entity.
   * Might be deprecated and replaced by a "ref" or "reference" property in the future
   */
  id: number | string;

  /**
   * The entity data (attributes value)
   */
  data: GetAttributesValues<T>;
}

/**
 * Union type that regroups all the different kinds of link
 */
export type ILink = IBasicLink | IMorphLink | ICircularLink;

/**
 * Default generic link structure
 */
interface IDefaultLink {
  /**
   * The link type
   * (useful for providers (destination) to adapt the logic following what kind of link is processed)
   */
  kind: string;

  /**
   * The relation type
   */
  relation: RelationsType;

  /**
   * Left side of the link
   * It should hold information about the entity that owns the dominant side of the link
   */
  left: {
    /**
     * Entity UID
     * (restricted to content type)
     */
    type: string;
    /**
     * Reference ID of the entity
     */
    ref: number | string;
    /**
     * Field used to hold the link in the entity
     */
    field: string;
    /**
     * If the link is part of a collection, keep its position here
     */
    pos?: number;
  };

  /**
   * Right side of the link
   * It should hold information about the entity attached to the left side of the link
   */
  right: {
    /**
     * Entity UID
     * (can be a content type or a component)
     */
    type: string;
    /**
     * Reference ID of the entity
     */
    ref: number | string;
    /**
     * Field used to hold the link in the entity
     */
    field?: string;
  };
}

/**
 * Basic link between two content type entities
 */
interface IBasicLink extends IDefaultLink {
  kind: 'relation.basic';
}

/**
 * Polymorphic link (one source content type to multiple different content types)
 */
interface IMorphLink extends IDefaultLink {
  kind: 'relation.morph';
}

/**
 * Regular link with the left and right sides having the save content-type
 */
interface ICircularLink extends IDefaultLink {
  kind: 'relation.circular';
}

/**
 * Strapi configurations
 */
interface IConfiguration<T = unknown> {
  type: 'core-store' | 'webhook';
  value: T;
}
