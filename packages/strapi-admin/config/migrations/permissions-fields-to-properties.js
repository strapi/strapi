'use strict';

const { has } = require('lodash/fp');

const permissionModelUID = 'strapi::permission';

const hasAttribute = attribute => has(`attributes.${attribute}`);
const hasFieldsAttribute = hasAttribute('fields');
const hasPropertiesAttribute = hasAttribute('properties');

const shouldRunMigration = (definition, previousDefinition) => {
  const isAdminPermissionModel = definition.uid === permissionModelUID;
  const targetedFieldsHaveChanged =
    // If the previous definition has fields attr but don't have properties attr
    hasFieldsAttribute(previousDefinition) &&
    !hasPropertiesAttribute(previousDefinition) &&
    // And if the current definition has properties attr but don't have fields attr
    !hasFieldsAttribute(definition) &&
    hasPropertiesAttribute(definition);

  return isAdminPermissionModel && targetedFieldsHaveChanged;
};

module.exports = {
  shouldRunBefore(options) {
    const { definition, previousDefinition } = options;

    return shouldRunMigration(definition, previousDefinition);
  },

  shouldRunAfter(options, context) {
    const { definition, previousDefinition } = options;
    const { permissionsFieldsToProperties = {} } = context;
    const { permissions = [] } = permissionsFieldsToProperties;

    console.log(permissions);
    return shouldRunMigration(definition, previousDefinition) && permissions.length > 0;
  },

  // Here we make a backup of the permission objects in the database, then we store it into the migration context
  async before(options, context) {
    const { model } = options;
    let permissions = [];

    switch (model.orm) {
      case 'bookshelf':
        permissions = await model.fetchAll();
        permissions = permissions.toJSON().map(permission => ({
          ...permission,
          fields: JSON.parse(permission.fields),
        }));
        break;
      case 'mongoose':
        permissions = await model.find().lean();
        break;
    }

    Object.assign(context, { permissionsFieldsToProperties: { permissions } });
  },

  // Based on the permissions sent in the context, we perform an update. { fields } => { properties: { fields } }
  async after(options, context) {
    const { model, ORM } = options;
    const { permissionsFieldsToProperties = {} } = context;
    const { permissions = [] } = permissionsFieldsToProperties;

    if (model.orm === 'bookshelf') {
      const update = async transacting => {
        for (const permission of permissions) {
          const { fields, ...rest } = permission;

          await model
            .forge({ id: rest.id })
            .save({ properties: { fields } }, { patch: true, transacting });
        }
      };

      await ORM.transaction(transacting => update(transacting));
    }

    if (model.orm === 'mongoose') {
      for (const permission of permissions) {
        const { fields, _id } = permission;

        await model.updateOne({ _id }, [
          { $set: { properties: { fields } } },
          { $unset: ['fields'] },
        ]);
      }
    }
  },
};
