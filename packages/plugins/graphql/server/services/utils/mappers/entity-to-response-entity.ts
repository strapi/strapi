import { map } from 'lodash/fp';

interface Entity extends Record<string, any> {
  id: string;
}
const entityToResponseEntity = (entity: Entity) => ({
  id: entity.id,
  attributes: entity,
});

const entitiesToResponseEntities = map(entityToResponseEntity);

export default () => ({
  entityToResponseEntity,
  entitiesToResponseEntities,
});
