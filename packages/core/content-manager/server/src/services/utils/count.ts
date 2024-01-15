import { Common, Schema } from '@strapi/types';
import { contentTypes } from '@strapi/utils';
import type { Entity } from '../entity-manager';

const { isVisibleAttribute } = contentTypes;

function getCountForRelation(
  attributeName: string,
  entity: Entity[string],
  model: Schema.ContentType | Schema.Component
) {
  // do not count createdBy, updatedBy, localizations etc.
  if (!isVisibleAttribute(model, attributeName)) {
    return entity;
  }

  if (Array.isArray(entity)) {
    return { count: entity.length };
  }

  return entity ? { count: 1 } : { count: 0 };
}

function getCountForDZ(entity: Entity[string]) {
  return entity.map((component: any) => {
    return getDeepRelationsCount(component, component.__component);
  });
}

function getCountFor(
  attributeName: string,
  entity: Entity[string],
  model: Schema.ContentType | Schema.Component
): any {
  const attribute = model.attributes[attributeName];

  switch (attribute?.type) {
    case 'relation':
      return getCountForRelation(attributeName, entity, model);
    case 'component':
      if (!entity) return null;
      if (attribute.repeatable) {
        return entity.map((component: any) =>
          getDeepRelationsCount(component, attribute.component)
        );
      }
      return getDeepRelationsCount(entity, attribute.component);
    case 'dynamiczone':
      return getCountForDZ(entity);
    default:
      return entity;
  }
}

const getDeepRelationsCount = (entity: Entity, uid: Common.UID.Schema): Entity => {
  const model = strapi.getModel(uid);

  return Object.keys(entity).reduce<Entity>(
    (relationCountEntity, attributeName) =>
      Object.assign(relationCountEntity, {
        [attributeName]: getCountFor(attributeName, entity[attributeName], model),
      }),
    {} as Entity
  );
};

export { getDeepRelationsCount };
