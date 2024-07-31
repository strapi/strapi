import { map } from 'lodash/fp';
import type { Entity } from '@strapi/types';

const entityToResponseEntity = (entity: { id: Entity.ID; [key: keyof any]: unknown }) => ({
  id: entity.id,
  attributes: entity,
});

const entitiesToResponseEntities = map(entityToResponseEntity);

export default () => ({
  entityToResponseEntity,
  entitiesToResponseEntities,
});
