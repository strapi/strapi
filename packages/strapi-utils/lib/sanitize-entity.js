'use strict';

module.exports = function sanitizeEntity(data, { model, withPrivate = false }) {
  if (typeof data !== 'object' || data == null) return data;

  const attributes = model.attributes;
  return Object.keys(data).reduce((acc, key) => {
    const attribute = attributes[key];
    if (attribute && attribute.private === true && withPrivate !== true) {
      return acc;
    }

    if (
      attribute &&
      (attribute.model || attribute.collection || attribute.type === 'group')
    ) {
      const targetName =
        attribute.model || attribute.collection || attribute.group;

      const targetModel = strapi.getModel(targetName, attribute.plugin);

      if (targetModel && data[key] !== null) {
        acc[key] = Array.isArray(data[key])
          ? data[key].map(entity =>
              sanitizeEntity(entity, { model: targetModel, withPrivate })
            )
          : sanitizeEntity(data[key], { model: targetModel, withPrivate });

        return acc;
      }
    }

    acc[key] = data[key];
    return acc;
  }, {});
};
