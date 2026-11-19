import type { Data } from '@strapi/types';

const entityToResponseEntity = (entity: { id: Data.ID; [key: keyof any]: unknown }) => ({
  id: entity.id,
  attributes: entity,
});

const entitiesToResponseEntities = (entities: Parameters<typeof entityToResponseEntity>[0][]) =>
  // Lodash map returned [] for null/undefined; keep that for callers.
  (entities ?? []).map((entity) => entityToResponseEntity(entity));

export default () => ({
  entityToResponseEntity,
  entitiesToResponseEntities,
});
