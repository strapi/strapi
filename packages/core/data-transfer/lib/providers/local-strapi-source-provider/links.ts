import { Duplex } from 'stream-chain';
import { isEmpty, castArray, concat, set } from 'lodash/fp';
import type { RelationsType } from '@strapi/strapi';
import { ILink } from '../../../types';

/**
 * Create a Duplex instance which will stream all the links from a Strapi instance
 */
export const createLinksStream = (strapi: any): Duplex => {
  const schemas: any[] = Object.values(strapi.contentTypes);

  // Destroy the Duplex stream instance
  const destroy = () => {
    if (!stream.destroyed) {
      stream.destroy();
    }
  };

  // Async generator stream that returns every link from a Strapi instance
  const stream = Duplex.from(async function* () {
    for (const schema of schemas) {
      const populate = getDeepPopulateQuery(strapi, schema);
      const query = { fields: ['id'], populate };

      // TODO: Replace with the DB stream API
      const results = await strapi.entityService.findMany(schema.uid, query);

      for (const entity of castArray(results)) {
        const links = parseEntityLinks(entity, populate, schema, strapi);

        for (const link of links) {
          yield link;
        }
      }
    }

    destroy();
  });

  return stream;
};

/**
 * Parse every links from an entity result (including nested components and dynamic zone levels)
 */
const parseEntityLinks = (entity: any, populate: any, schema: any, strapi: any): any[] => {
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

    if (!value) {
      continue;
    }

    if (attribute.type === 'component') {
      const componentSchema = strapi.components[attribute.component];
      const componentLinks = parseEntityLinks(value, subPopulate.populate, componentSchema, strapi);

      links.push(...componentLinks);
    }

    if (attribute.type === 'dynamiczone') {
      const dzLinks = value
        .map(({ __component, ...item }: any) =>
          parseEntityLinks(item, subPopulate.populate, strapi.components[__component], strapi)
        )
        .reduce((acc: any, links: any) => acc.concat(...links), []);

      links.push(...dzLinks);
    }

    if (attribute.type === 'relation') {
      const relationLinks = parseRelationLinks({ entity, fieldName: key, value, schema });

      links.push(...relationLinks);
    }
  }

  return links;
};

/**
 * Parse links contained in a relational attribute
 */
const parseRelationLinks = ({ entity, schema, fieldName, value }: any): ILink[] => {
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
 * Get a deep populate query for a given schema
 * It will populate first level for relations and media as well as
 * first-level relations for nested components and dynamic zones' components
 */
const getDeepPopulateQuery = (strapi: any, schema: any) => {
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
        const componentPopulate = getDeepPopulateQuery(strapi, componentSchema);

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
      const componentPopulate = getDeepPopulateQuery(strapi, componentSchema);

      if (!isEmpty(componentPopulate)) {
        setPopulateKey({ fields: ['id'], populate: componentPopulate });
      }
    }
  }

  return populate;
};

/**
 * Domain util to create a link
 * TODO: Move that to the domain layer when we'll update it
 */
const linkBuilder = <T extends ILink = ILink>(kind: T['kind'], relation: RelationsType) => {
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
