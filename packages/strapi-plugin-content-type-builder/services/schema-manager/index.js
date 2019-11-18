'use strict';

const path = require('path');

const fse = require('fs-extra');
const _ = require('lodash');
const pluralize = require('pluralize');

const { convertAttributes } = require('../../utils/attributes');
const { nameToSlug, nameToCollectionName } = require('../../utils/helpers');
const componentService = require('../Components');

const createSchemaHandler = infos => {
  const uid = infos.uid;
  const dir = infos.dir;
  const filename = infos.filename;

  // always keep it the same to rollback
  let initialSchema = Object.freeze(infos.schema);
  let schema = _.cloneDeep(infos.schema);

  let modified = false;

  return {
    uid,
    dir,
    filename,
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

    async flush() {
      if (modified === true) {
        const filePath = path.join(dir, filename);

        await fse.ensureFile(filePath);
        return fse.writeJSON(filePath, schema, { spaces: 2 });
      }

      return Promise.resolve();
    },

    async rollback() {
      const filePath = path.join(dir, filename);
      // it is a creating
      if (!uid) {
        await fse.remove(filePath);

        const list = await fse.readdir(dir);
        if (list.length === 0) {
          await fse.remove(dir);
        }
        return;
      }

      if (modified === true) {
        await fse.ensureFile(filePath);
        return fse.writeJSON(filePath, initialSchema, { spaces: 2 });
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
    tmpContentTypes.set(
      contentTypes[key].uid,
      createSchemaHandler(contentTypes[key])
    );
  });

  // init temporary components:
  Object.keys(components).forEach(key => {
    tmpComponents.set(
      components[key].uid,
      createSchemaHandler(components[key])
    );
  });

  const ctx = {
    get components() {
      return tmpComponents;
    },
    get contentTypes() {
      return tmpComponents;
    },

    /**
     * create a component in the tmpComponent map
     */
    createComponent(infos) {
      const uid = componentService.createComponentUID(infos);

      if (tmpComponents.has(uid)) {
        throw new Error('component.alreadyExists');
      }

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

      const handler = createSchemaHandler({
        dir: path.join(strapi.dir, 'components', nameToSlug(category)),
        filename: `${nameToSlug(name)}.json`,
      });

      handler.uid = uid;
      handler.schema = {
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

      tmpComponents.set(uid, handler);
      return handler;
    },

    flush() {
      return Promise.all(
        [
          ...Array.from(tmpComponents.values()),
          ...Array.from(tmpContentTypes.values()),
        ].map(schema => schema.flush())
      );
    },
    rollback() {
      return Promise.all(
        [
          ...Array.from(tmpComponents.values()),
          ...Array.from(tmpContentTypes.values()),
        ].map(schema => schema.rollback())
      );
    },
  };

  return ctx;
};

module.exports = function createSchemasManager() {
  const components = Object.keys(strapi.components).map(key => {
    const compo = strapi.components[key];

    return {
      uid: compo.uid,
      filename: compo.__filename__,
      dir: path.join(strapi.dir, 'components'),
      schema: compo.__schema__,
    };
  });

  const contentTypes = Object.keys(strapi.contentTypes).map(key => {
    const contentType = strapi.contentTypes[key];

    let dir;
    if (contentType.plugin) {
      dir = `./extensions/${contentType.plugin}/models`;
    } else {
      dir = `./api/${contentType.apiName}/models`;
    }

    return {
      uid: contentType.uid,
      filename: contentType.__filename__,
      dir: path.join(strapi.dir, dir),
      schema: contentType.__schema__,
    };
  });

  return {
    async edit(editorFn) {
      const trx = createTransaction({
        components,
        contentTypes,
      });

      const result = await editorFn(trx);

      await trx
        .flush()
        .catch(error => {
          console.error('Error writing schema files', error);
          return trx.rollback();
        })
        .catch(error => {
          console.error(
            'Error rolling back schema files. You might need to fix your files manually',
            error
          );

          throw new Error('Invalid schema edition');
        });

      return result;
    },
  };
};
