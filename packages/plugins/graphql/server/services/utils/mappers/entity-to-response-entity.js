'use strict';

const { map } = require('lodash/fp');

const entityToResponseEntity = (entity) => ({ id: entity.id, attributes: entity });

const entitiesToResponseEntities = map(entityToResponseEntity);

module.exports = () => ({
  entityToResponseEntity,
  entitiesToResponseEntities,
});
