'use strict';

module.exports = function sanitizeEntity(data, { model, withPrivate = false }) {
  if (typeof data !== 'object' || data == null) return data;

  let plainData = typeof data.toJSON === 'function' ? data.toJSON() : data;

  if (typeof plainData !== 'object') return plainData;

  const attributes = model.attributes;
  return Object.keys(plainData).reduce((acc, key) => {
    const attribute = attributes[key];
    if (attribute && attribute.private === true && withPrivate !== true) {
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

    if (attribute && attribute.components && plainData[key] !== null) {
      acc[key] = plainData[key].map(data => {
        const model = strapi.getModel(data.__component);
        return model ? sanitizeEntity(data, { model, withPrivate }) : null;
      });
      return acc;
    }

    acc[key] = plainData[key];
    return acc;
  }, {});
};
