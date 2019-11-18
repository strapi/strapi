'use strict';

const path = require('path');

const fse = require('fs-extra');
const _ = require('lodash');
const pluralize = require('pluralize');

const { convertAttributes } = require('../../utils/attributes');
const { nameToSlug, nameToCollectionName } = require('../../utils/helpers');

const createSchema = infos => {
  const uid = infos.uid;
  const dir = infos.dir;
  const filename = infos.filename;

  // always keep it the same to rollback
  let initialSchema = Object.freeze(infos.schema);
  let schema = _.cloneDeep(infos.schema);

  let modified = false;

  return {
    get schema() {
      return _.cloneDeep(schema);
    },

    set schema(val) {
      modified = true;
      schema = val;
    },

    get(path) {
      return _.get(schema, path);
    },

    set(path, val) {
      modified = true;

      _.set(schema, path, val);

      return this;
    },

    unset(path) {
      modified = true;

      _.unset(schema, path);

      return this;
    },

    flush() {
      if (modified === true) {
        return fse.writeJSON(path.join(dir, filename), schema, { spaces: 2 });
      }

      return Promise.resolve();
    },
    rollback() {
      // it is a creating
      if (!uid) {
        return fse.remove(path.join(dir, filename));
      }

      if (modified === true) {
        return fse.writeJSON(path.join(dir, filename), initialSchema, {
          spaces: 2,
        });
      }

      return Promise.resolve();
    },
  };
};

const createTransaction = ({ components, contentTypes }) => {
  const tmpComponents = new Map();
  const tmpContentTypes = new Map();

  // init temporary ContentTypes:
  Object.keys(contentTypes).forEach(key => {
    tmpContentTypes.set(key, createSchema(contentTypes[key]));
  });

  // init temporary components:
  Object.keys(components).forEach(key => {
    tmpComponents.set(key, createSchema(components[key]));
  });

  const ctx = {
    get components() {
      return Array.from(tmpComponents.values());
    },
    get contentTypes() {
      return Array.from(tmpComponents.values());
    },

    get allSchemas() {
      return [...this.components, ...this.contentTypes];
    },

    /**
     * create a component in the tmpComponent map
     */
    createComponent(uid, infos) {
      const {
        name,
        icon,
        category,
        connection = _.get(
          strapi,
          ['config', 'currentEnvironment', 'database', 'defaultConnection'],
          'default'
        ),
        description = '',
        collectionName,
        attributes,
      } = infos;

      const componentSchema = {
        info: {
          name,
          description,
          icon,
        },
        connection,
        collectionName:
          collectionName ||
          `components_${nameToCollectionName(category)}_${nameToCollectionName(
            pluralize(name)
          )}`,
        attributes: convertAttributes(attributes),
      };

      const schema = createSchema({
        dir: path.join(strapi.dir, 'components', nameToSlug(category)),
        filename: `${nameToSlug(name)}.json`,
        scehma: componentSchema,
      });

      tmpComponents.set(uid, schema);
    },

    flush() {
      const flushOps = this.allSchemas.map(schema => {
        return schema.flush();
      });

      return Promise.all(flushOps);
    },
    rollback() {
      const rollbackOps = this.allSchemas.map(schema => {
        return schema.rollback();
      });

      return Promise.all(rollbackOps);
    },
  };

  return ctx;
};

module.exports = function createSchemasManager({ components, contentTypes }) {
  return {
    async edit(editorFn) {
      const trx = createTransaction({
        components,
        contentTypes,
      });

      try {
        await editorFn(trx);
        await trx.flush();
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    },
  };
};
