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
      'document',
    ],
    // attributes are compared with snake_case(name), so only snake_case is needed here and camelCase + UPPER_CASE matches will still be caught
    attributes: [
      // TODO: these need to come from a centralized place so we don't break things accidentally in the future and can share them outside the CTB, for example on Strapi bootstrap prior to schema db sync

      // ID fields
      'id',
      'documentId',
      'document_id',

      // Creator fields
      'created_at',
      'updated_at',
      'published_at',
      'created_by_id',
      'updated_by_id',
      // does not actually conflict because the fields are called *_by_id but we'll leave it to avoid confusion
      'created_by',
      'updated_by',

      // Used for Strapi functionality
      'entry_id',
      'strapi',
      'status',
      'localizations',
      'meta',
      'locale',
      'stage',
      'release',
      'history',
      'version',
    ],
  };
  // strapi.db.getReservedNames();
};
