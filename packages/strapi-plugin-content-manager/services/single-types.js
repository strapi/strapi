'use strict';

const { omit, prop, has, assoc } = require('lodash/fp');
const { contentTypes: contentTypesUtils } = require('strapi-utils');
const { getService } = require('../utils');

const { CREATED_BY_ATTRIBUTE } = contentTypesUtils.constants;

const pickWritableFields = ({ model }) => {
  return omit(contentTypesUtils.getNonWritableAttributes(strapi.getModel(model)));
};

const fetchCreatorRoles = entity => {
  const createdByPath = `${CREATED_BY_ATTRIBUTE}.id`;

  if (has(createdByPath, entity)) {
    const creatorId = prop(createdByPath, entity);
    return strapi.query('role', 'admin').find({ 'users.id': creatorId }, []);
  }

  return [];
};

module.exports = {
  async fetchEntitiyWithCreatorRoles(model) {
    const entity = await getService('contentmanager').fetchAll(model);

    if (!entity) {
      return entity;
    }

    const roles = await fetchCreatorRoles(entity);
    return assoc(`${CREATED_BY_ATTRIBUTE}.roles`, roles, entity);
  },

  async create(body, { model }) {
    const { files } = body;

    const data = pickWritableFields({ model })(body.data);

    const entity = await getService('contentmanager').create({ data, files }, { model });

    await strapi.telemetry.send('didCreateFirstContentTypeEntry', { model });
    return entity;
  },

  async update(existingEntity, body, { model }) {
    const { files } = body;

    const data = pickWritableFields({ model })(body.data);

    const entity = await getService('contentmanager').edit(
      { id: existingEntity.id },
      { data, files },
      { model }
    );

    return entity;
  },

  async delete(existingEntity, { model }) {
    return getService('contentmanager').delete(model, {
      id: existingEntity.id,
    });
  },
};
