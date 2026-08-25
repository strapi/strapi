import type { Data } from '@strapi/types';

const entityToResponseEntity = (entity: { id: Data.ID; [key: keyof any]: unknown }) => ({
  id: entity.id,
  attributes: entity,
});

const entitiesToResponseEntities = (entities: Array<{ id: Data.ID; [key: keyof any]: unknown }>) =>
  entities.map((entity) => entityToResponseEntity(entity));

export default () => ({
  entityToResponseEntity,
  entitiesToResponseEntities,
});
