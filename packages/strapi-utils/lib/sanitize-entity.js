'use strict';

const _ = require('lodash');

module.exports = function sanitizeEntity(data, { model, withPrivate = false }) {
  if (typeof data !== 'object' || data == null) return data;

  let plainData = typeof data.toJSON === 'function' ? data.toJSON() : data;

  if (typeof plainData !== 'object') return plainData;

  const attributes = model.attributes;

  const hiddenFields = _.union(
    _.get(strapi, ['config', 'currentEnvironment', 'response', 'hiddenFields'], []),
    _.get(model, 'hiddenFields', [])
  );

  return Object.keys(plainData).reduce((acc, key) => {
    const attribute = attributes[key];

    if (
      (hiddenFields.includes(key) && withPrivate !== true) ||
      (attribute && attribute.private === true && withPrivate !== true)
    ) {
      return acc;
    }

    if (attribute && (attribute.model || attribute.collection || attribute.type === 'component')) {
      const targetName = attribute.model || attribute.collection || attribute.component;

      const targetModel = strapi.getModel(targetName, attribute.plugin);

      if (targetModel && plainData[key] !== null) {
        acc[key] = Array.isArray(plainData[key])
          ? plainData[key].map(entity =>
              sanitizeEntity(entity, { model: targetModel, withPrivate })
            )
          : sanitizeEntity(plainData[key], { model: targetModel, withPrivate });

        return acc;
      }
    }

    acc[key] = plainData[key];
    return acc;
  }, {});
};
