import type { RelationsType } from '@strapi/strapi';
import { concat, set, isEmpty } from 'lodash/fp';
import type { ILink } from '../../../../types';

// TODO: Fix any typings when we'll have better Strapi types

/**
 * Domain util to create a link
 * TODO: Move that to the domain layer when we'll update it
 */
export const linkBuilder = <T extends ILink = ILink>(kind: T['kind'], relation: RelationsType) => {
  const link: Partial<T> = {};

  link.kind = kind;
  link.relation = relation;

  return {
    left(type: string, ref: string | number, field: string, pos?: number) {
      link.left = { type, ref, field, pos };
      return this;
    },

    right(type: string, ref: string | number, field?: string) {
      link.right = { type, ref, field };
      return this;
    },

    get value() {
      return link.left && link.right ? (link as ILink) : null;
    },
  };
};

/**
 * Parse links contained in a relational attribute
 */
export const parseRelationLinks = ({ entity, schema, fieldName, value }: any): ILink[] => {
  const attribute = schema.attributes[fieldName];

  const { relation, target }: { relation: RelationsType; target: string } = attribute;

  // Handle ToMany relations
  if (Array.isArray(value)) {
    return (
      value
        // Get links from value
        .map((item) => parseRelationLinks({ entity, schema, fieldName, value: item }))
        // Flatten the results, to make sure we're dealing with the right data structure
        .flat()
        // Update the pos with the relation index in the collection
        .map((link, i) => set<ILink>('left.pos', i, link))
    );
  }

  const isMorphRelation = relation.startsWith('morph');
  const isCircularRelation = !isMorphRelation && target === schema.uid;

  // eslint-disable-next-line no-nested-ternary
  const kind: ILink['kind'] = isMorphRelation
    ? // Polymorphic relations
      'relation.morph'
    : isCircularRelation
    ? // Self referencing relations
      'relation.circular'
    : // Regular relations
      'relation.basic';

  const link = linkBuilder(kind, relation)
    .left(schema.uid, entity.id, fieldName)
    .right(target, value.id, attribute.inversedBy).value;

  return link ? [link] : [];
};

/**
 * Parse every links from an entity result (including nested components and dynamic zone levels)
 */
export const parseEntityLinks = (entity: any, populate: any, schema: any, strapi: any): any[] => {
  if (!entity) {
    return [];
  }

  if (Array.isArray(entity)) {
    return entity
      .map((item) => parseEntityLinks(item, populate, schema, strapi))
      .reduce(concat, [])
      .flat();
  }

  const { attributes } = schema;
  const links = [];

  for (const key of Object.keys(populate)) {
    const attribute = attributes[key];
    const value = entity[key];
    const subPopulate = populate[key];

    // Ignore nil values (relations, components or dynamic zones not set)
    if (!value) {
      continue;
    }

    // Components
    // Recurse to find relations
    if (attribute.type === 'component') {
      const componentSchema = strapi.components[attribute.component];
      const componentLinks = parseEntityLinks(value, subPopulate.populate, componentSchema, strapi);

      links.push(...componentLinks);
    }

    // Dynamic Zones
    // We need to extract links from each items in the DZ's components
    if (attribute.type === 'dynamiczone') {
      const dzLinks = value
        .map(({ __component, ...item }: any) =>
          parseEntityLinks(item, subPopulate.populate, strapi.components[__component], strapi)
        )
        .reduce((acc: any, rlinks: any) => acc.concat(...rlinks), []);

      links.push(...dzLinks);
    }

    // Relations
    // If it's a regular relation, extract the links but do not recurse further
    if (attribute.type === 'relation') {
      const relationLinks = parseRelationLinks({ entity, fieldName: key, value, schema });

      links.push(...relationLinks);
    }
  }

  return links;
};

/**
 * Get a deep populate query for a given schema
 * It will populate first level for relations and media as well as
 * first-level relations for nested components and dynamic zones' components
 */
export const getDeepPopulateQuery = (schema: any, strapi: any) => {
  const populate: { [key: string]: any } = {};

  for (const [key, attribute] of Object.entries<any>(schema.attributes)) {
    const setPopulateKey = (value: any) => {
      populate[key] = value;
    };

    // Owning side of a relation
    if (attribute.type === 'relation' && !attribute.mappedBy) {
      setPopulateKey({ fields: ['id'] });
    }

    // Media
    if (attribute.type === 'media') {
      setPopulateKey({ fields: ['id'] });
    }

    // Dynamic zone (nested structure)
    if (attribute.type === 'dynamiczone') {
      const subPopulate: { [key: string]: any } = {};

      for (const component of attribute.components) {
        const componentSchema = strapi.components[component];
        const componentPopulate = getDeepPopulateQuery(componentSchema, strapi);

        // FIXME: Same problem as when trying to populate dynamic zones,
        // we don't have a way to discriminate components queries (which
        // can cause issue when components share same fields name)
        Object.assign(subPopulate, componentPopulate);
      }

      if (!isEmpty(subPopulate)) {
        setPopulateKey({ fields: ['id'], populate: subPopulate });
      }
    }

    // Component (nested structure)
    if (attribute.type === 'component') {
      const componentSchema = strapi.components[attribute.component];
      const componentPopulate = getDeepPopulateQuery(componentSchema, strapi);

      if (!isEmpty(componentPopulate)) {
        setPopulateKey({ fields: ['id'], populate: componentPopulate });
      }
    }
  }

  return populate;
};
