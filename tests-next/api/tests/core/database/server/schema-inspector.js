'use strict';

const ARTICLE_UID = 'api::inspector-article.inspector-article';
const CATEGORY_UID = 'api::inspector-category.inspector-category';

const inspector = (strapi) => strapi.db.dialect.schemaInspector;

module.exports = {
  actions: {
    /** Table names from the metadata, the way the old test read them. */
    tables({ strapi }) {
      const articleMeta = strapi.db.metadata.get(ARTICLE_UID);
      return {
        articleTable: articleMeta.tableName,
        categoryTable: strapi.db.metadata.get(CATEGORY_UID).tableName,
        linkTable: articleMeta.attributes.category.joinTable.name,
      };
    },

    getSchema({ strapi }) {
      return inspector(strapi).getSchema();
    },

    getForeignKeys({ strapi }, { table }) {
      return inspector(strapi).getForeignKeys(table);
    },

    getIndexes({ strapi }, { table }) {
      return inspector(strapi).getIndexes(table);
    },

    /** Creates two tables with a composite foreign key, inspects them, and drops them. */
    async compositeForeignKeys({ strapi }) {
      const knex = strapi.db.connection;
      const parent = 'inspector_composite_parent';
      const child = 'inspector_composite_child';

      await knex.schema.dropTableIfExists(child);
      await knex.schema.dropTableIfExists(parent);

      try {
        await knex.schema.createTable(parent, (t) => {
          t.integer('a').notNullable();
          t.integer('b').notNullable();
          t.primary(['a', 'b']);
        });
        await knex.schema.createTable(child, (t) => {
          t.integer('pa').notNullable();
          t.integer('pb').notNullable();
          t.foreign(['pa', 'pb']).references(['a', 'b']).inTable(parent);
        });

        return { parent, fks: await inspector(strapi).getForeignKeys(child) };
      } finally {
        await knex.schema.dropTableIfExists(child);
        await knex.schema.dropTableIfExists(parent);
      }
    },
  },
};
