import type { ContentTypeSchema } from '@strapi/strapi';

// @ts-ignore
import * as componentsService from '@strapi/strapi/lib/services/entity-service/components';
import { assign, map, omit } from 'lodash/fp';

const sanitizeComponentLikeAttributes = <T extends object>(model: ContentTypeSchema, data: T) => {
  const { attributes } = model;

  const componentLikeAttributesKey = Object.entries(attributes)
    .filter(([, attribute]) => ['component', 'dynamiczone'].includes(attribute.type))
    .map(([key]) => key);

  return omit(componentLikeAttributesKey, data);
};

const omitInvalidCreationAttributes = omit(['id']);

const createEntityQuery = (strapi: Strapi.Strapi) => {
  const components = {
    assignToEntity: async <T extends object>(uid: string, data: T) => {
      const model = strapi.getModel(uid);

      const entityComponents = await componentsService.createComponents(uid, data);
      const dataWithoutComponents = sanitizeComponentLikeAttributes(model, data);

      return assign(entityComponents, dataWithoutComponents);
    },
    create: async <T>(uid: string, data: T) => {
      return data;
    },
    get: async <T extends object>(uid: string, entity: T) => {
      return componentsService.getComponents(uid, entity);
    },
    delete<T extends object>(uid: string, components: T) {
      return componentsService.deleteComponents(uid, components, { loadComponents: false });
    },
  };

  const query = (uid: string) => {
    const create = async <T extends { data: U }, U extends object>(query: T) => {
      const dataWithComponents = await components.assignToEntity(uid, query.data);
      const sanitizedData = omitInvalidCreationAttributes(dataWithComponents);

      return strapi.db.query(uid).create({ ...query, data: sanitizedData });
    };

    const createMany = async <T extends { data: U[] }, U extends object>(query: T) => {
      return (
        Promise.resolve(query.data)
          // Create components for each entity
          .then(map((data) => components.assignToEntity(uid, data)))
          // Remove unwanted attributes
          .then(map(omitInvalidCreationAttributes))
          // Execute a strapi db createMany query with all the entities + their created components
          .then((data) => strapi.db.query(uid).createMany({ ...query, data }))
      );
    };

    const deleteMany = async <T extends object>(query?: T) => {
      const entitiesToDelete = await strapi.db.query(uid).findMany(query ?? {});

      if (!entitiesToDelete.length) {
        return null;
      }

      const componentsToDelete = await Promise.all(
        entitiesToDelete.map((entityToDelete) => components.get(uid, entityToDelete))
      );

      const deletedEntities = await strapi.db.query(uid).deleteMany(query);
      await Promise.all(componentsToDelete.map((compos) => components.delete(uid, compos)));

      return deletedEntities;
    };

    return { create, createMany, deleteMany };
  };

  return query;
};

export { createEntityQuery };
