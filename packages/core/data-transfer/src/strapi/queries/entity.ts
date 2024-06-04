import { assign, isArray, isEmpty, isObject, map, omit, size } from 'lodash/fp';

import type { Core, UID, Data, Struct } from '@strapi/types';
import * as componentsService from '../../utils/components';

const sanitizeComponentLikeAttributes = <T extends Struct.Schema>(
  model: T,
  data: Data.Entity<T['uid']>
) => {
  const { attributes } = model;

  const componentLikeAttributesKey = Object.entries(attributes)
    .filter(([, attribute]) => attribute.type === 'component' || attribute.type === 'dynamiczone')
    .map(([key]) => key);

  return omit(componentLikeAttributesKey, data);
};

const omitInvalidCreationAttributes = omit(['id']);

const createEntityQuery = (strapi: Core.Strapi): any => {
  const components = {
    async assignToEntity(uid: UID.Schema, data: any) {
      const model = strapi.getModel(uid);

      const entityComponents = await componentsService.createComponents(uid, data);
      const dataWithoutComponents = sanitizeComponentLikeAttributes(model, data);

      return assign(entityComponents, dataWithoutComponents);
    },

    async get<T extends object>(uid: string, entity: T) {
      return componentsService.getComponents(uid as UID.Schema, entity as any);
    },

    delete<T extends object>(uid: string, componentsToDelete: T) {
      return componentsService.deleteComponents(uid as UID.Schema, componentsToDelete as any, {
        loadComponents: false,
      });
    },
  };

  const query = (uid: UID.Schema) => {
    const create = async <T extends { data: U }, U extends object>(params: T) => {
      const dataWithComponents = await components.assignToEntity(uid, params.data);
      const sanitizedData = omitInvalidCreationAttributes(dataWithComponents);

      return strapi.db.query(uid).create({ ...params, data: sanitizedData });
    };

    const createMany = async <T extends { data: U[] }, U extends object>(params: T) => {
      return (
        Promise.resolve(params.data)
          // Create components for each entity
          .then(map((data) => components.assignToEntity(uid, data)))
          // Remove unwanted attributes
          .then(map(omitInvalidCreationAttributes))
          // Execute a strapi db createMany query with all the entities + their created components
          .then((data) => strapi.db.query(uid).createMany({ ...params, data }))
      );
    };

    const deleteMany = async <T extends object>(params?: T) => {
      const entitiesToDelete = await strapi.db.query(uid).findMany(params ?? {});

      if (!entitiesToDelete.length) {
        return null;
      }

      const componentsToDelete = await Promise.all(
        entitiesToDelete.map((entityToDelete) => components.get(uid, entityToDelete))
      );

      const deletedEntities = await strapi.db.query(uid).deleteMany(params);
      await Promise.all(componentsToDelete.map((compos) => components.delete(uid, compos)));

      return deletedEntities;
    };

    const getDeepPopulateComponentLikeQuery = (
      contentType: Struct.Schema,
      params = { select: '*' }
    ) => {
      const { attributes } = contentType;

      const populate: any = {};

      const entries: [string, any][] = Object.entries(attributes);

      for (const [key, attribute] of entries) {
        if (attribute.type === 'component') {
          const component = strapi.getModel(attribute.component);
          const subPopulate = getDeepPopulateComponentLikeQuery(component, params);

          if ((isArray(subPopulate) || isObject(subPopulate)) && size(subPopulate) > 0) {
            populate[key] = { ...params, populate: subPopulate };
          }

          if (isArray(subPopulate) && isEmpty(subPopulate)) {
            populate[key] = { ...params };
          }
        }

        if (attribute.type === 'dynamiczone') {
          const { components: componentsUID } = attribute;

          const on: any = {};

          for (const componentUID of componentsUID) {
            const component = strapi.getModel(componentUID);
            const subPopulate = getDeepPopulateComponentLikeQuery(component, params);

            if ((isArray(subPopulate) || isObject(subPopulate)) && size(subPopulate) > 0) {
              on[componentUID] = { ...params, populate: subPopulate };
            }

            if (isArray(subPopulate) && isEmpty(subPopulate)) {
              on[componentUID] = { ...params };
            }
          }

          populate[key] = size(on) > 0 ? { on } : true;
        }
      }

      const values = Object.values(populate);

      if (values.every((value) => value === true)) {
        return Object.keys(populate);
      }

      return populate;
    };

    return {
      create,
      createMany,
      deleteMany,
      getDeepPopulateComponentLikeQuery,

      get deepPopulateComponentLikeQuery() {
        const contentType = strapi.getModel(uid);

        return getDeepPopulateComponentLikeQuery(contentType);
      },
    };
  };

  return query;
};

export { createEntityQuery };
