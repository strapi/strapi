// NOTE: All these reserved names MUST be in camelCase, because they will also be converted to snake_case and compared against incoming values

export const getReservedNames = () => {
  return {
    models: [
      'boolean',
      'date',
      'dateTime',
      'time',
      'upload',
      'then', // https://github.com/strapi/strapi/issues/15557
    ],
    attributes: [
      // TODO V5: these need to come from a centralized place so we don't break things accidentally in the future
      'id',
      'createdAt',
      'updatedAt',
      'publishedAt',
      'createdById',
      'updatedById',

      // TODO v5: restricting 'locale' would be a breaking change in v4 but we will need it if this is not resolved: https://github.com/strapi/strapi/issues/10181

      // not actually breaking but we'll leave it to avoid confusion
      'createdBy',
      'updatedBy',
    ],
  };
  // strapi.db.getReservedNames();
};
