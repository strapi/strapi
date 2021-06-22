'use strict';

const { buildAPISchema } = require('./generators/content-api');

const generateSchema = () => {
  const cts = Object.values(strapi.contentTypes);
  const components = Object.values(strapi.components);

  return buildAPISchema([...cts, ...components]);
};

module.exports = { generateSchema };
