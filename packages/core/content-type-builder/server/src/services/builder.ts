export const getReservedNames = () => {
  return {
    // use kebab case everywhere since singularName and pluralName are validated that way
    models: [
      'boolean',
      'date',
      'date-time',
      'time',
      'upload',
      'then', // https://github.com/strapi/strapi/issues/15557
      'rest', // https://github.com/strapi/strapi/issues/13643
    ],
    // attributes are compared with snake_case(name), so only snake_case is needed here and camelCase + UPPER_CASE matches will still be caught
    attributes: [
      // TODO V5: these need to come from a centralized place so we don't break things accidentally in the future
      'id',
      'created_at',
      'updated_at',
      'published_at',
      'created_by_id',
      'updated_by_id',

      // TODO v5: restricting 'locale' would be a breaking change in v4 but we will need it if this is not resolved: https://github.com/strapi/strapi/issues/10181

      // not actually breaking but we'll leave it to avoid confusion
      'created_by',
      'updated_by',
    ],
  };
  // strapi.db.getReservedNames();
};
