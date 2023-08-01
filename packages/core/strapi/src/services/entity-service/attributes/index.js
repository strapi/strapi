'use strict';

const transforms = require('./transforms');

const applyTransforms = (data, context) => {
  const { contentType } = context;

  const entries = Object.entries(data);

  for (const [attributeName, value] of entries) {
    const attribute = contentType.attributes[attributeName];

    if (!attribute) {
      continue;
    }

    const transform = transforms[attribute.type];

    if (transform) {
      const attributeContext = { ...context, attributeName, attribute };

      data[attributeName] = transform(value, attributeContext);
    }
  }

  return data;
};

module.exports = {
  applyTransforms,
};
