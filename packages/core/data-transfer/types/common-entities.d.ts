import { GetAttributesValues } from '@strapi/strapi';
import { SchemaUID } from '@strapi/strapi/lib/types/utils';

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
export interface IEntity<T extends SchemaUID> {
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
export type ILink = IBasicLink | IMorphLink | ICircularLink | IComponentLink | IDynamicZoneLink;

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
   * Left side of the link
   * It should hold information about the entity that owns the dominant side of the link
   */
  left: {
    /**
     * Entity UID
     * (restricted to content type)
     */
    type: Strapi.ContentTypeUIDs;
    /**
     * Reference ID of the entity
     */
    ref: number | string;
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
    type: SchemaUID;
    /**
     * Reference ID of the entity
     */
    ref: number | string;
  };
}

/**
 * Basic link between two content type entities
 */
interface IBasicLink extends IDefaultLink {
  kind: 'relation.basic';

  right: {
    /**
     * The right side of a relation.basic link must be a content type
     */
    type: Strapi.ContentTypeUIDs;
    /**
     * Reference ID of the entity
     */
    ref: number | string;
  };
}

/**
 * Polymorphic link (one source content type to multiple different content types)
 */
interface IMorphLink extends IDefaultLink {
  kind: 'relation.morph';

  right: {
    /**
     * The right side of a relation.morph link must be a content type
     */
    type: Strapi.ContentTypeUIDs;
    /**
     * Reference ID of the target entity
     */
    ref: number | string;
    /**
     * The target attribute used to hold the value
     */
    attribute: string;
    /**
     * Can contain the link's position (relative to other similar links)
     */
    order: number;
  };
}

/**
 * Regular link with the left and right sides having the save content-type
 */
interface ICircularLink extends IDefaultLink {
  kind: 'relation.circular';
}

/**
 * Link from a content type to a component
 */
interface IComponentLink extends IDefaultLink {
  kind: 'component.basic';

  right: {
    /**
     * The right side of the link must be a component
     */
    type: Strapi.ComponentUIDs;
    /**
     * Reference ID of the component
     */
    ref: number | string;
    /**
     * The attribute used to hold the link value in the component
     */
    attribute: string;
    /**
     * Can contain the link's position (relative to other similar links)
     */
    order: number;
  };
}

/**
 * Link from a content type to a dynamic zone
 * Very similar to the component link but with a different name
 */
interface IDynamicZoneLink extends IDefaultLink {
  kind: 'dynamiczone.basic';

  right: {
    /**
     * The right side of the link must be a component
     */
    type: Strapi.ComponentUIDs;
    /**
     * Reference ID of the component
     */
    ref: number | string;
    /**
     * The attribute used to hold the link value in the component
     */
    attribute: string;
    /**
     * MUST contain the link's position relative to other links
     * bound to the same dynamic zone (aka. left side of the link)
     */
    order: number;
  };
}

/**
 * Represent a piece of a media file
 *
 * /!\ Draft Version /!\
 *
 * Note: even individual media will probably get streamed chunk by chunk,
 * we need a way to identify to which entity they're related to.
 *
 * Also, it might get tricky to apply specific transformations to media as a whole
 */
export interface IMedia {
  /**
   * The media mime type
   */
  type: 'png' | 'pdf'; // | ... | ...
  /**
   * Reference ID for the media
   */
  ref: number | string;
  /**
   * Data chunk (as a buffer) that contains a part of the file
   */
  chunk: Buffer | Buffer[];
}
