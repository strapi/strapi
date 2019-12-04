'use strict';

const path = require('path');
const fse = require('fs-extra');
const _ = require('lodash');
const { toUID } = require('../../utils/attributes');

module.exports = function createSchemaHandler(infos) {
  const { category, modelName, plugin, uid, dir, filename, schema } = infos;

  const initialState = {
    modelName,
    plugin,
    category,
    uid,
    dir,
    filename,
    schema: schema || {},
  };

  const state = _.cloneDeep(initialState);

  // always keep it the same to rollback
  Object.freeze(initialState.schema);

  let modified = false;
  let deleted = false;

  return {
    get modelName() {
      return initialState.modelName;
    },

    get plugin() {
      return initialState.plugin;
    },

    get category() {
      return initialState.category;
    },

    get uid() {
      return state.uid;
    },

    setUID(val) {
      modified = true;

      state.uid = val;
      return this;
    },

    setDir(val) {
      modified = true;

      state.dir = val;
      return this;
    },

    get schema() {
      return _.cloneDeep(state.schema);
    },

    setSchema(val) {
      modified = true;

      state.schema = _.cloneDeep(val);
      return this;
    },

    // get a particuar path inside the schema
    get(path) {
      return _.get(state.schema, path);
    },

    // set a particuar path inside the schema
    set(path, val) {
      modified = true;

      _.set(state.schema, path, val || _.get(state.schema, path));

      return this;
    },

    // delete a particuar path inside the schema
    unset(path) {
      modified = true;

      _.unset(state.schema, path);

      return this;
    },

    delete() {
      deleted = true;
      return this;
    },

    removeContentType(uid) {
      const { attributes } = state.schema;

      Object.keys(attributes).forEach(key => {
        const attr = attributes[key];
        const target = attr.model || attr.collection;
        const plugin = attr.plugin;

        const relationUID = toUID(target, plugin);

        if (relationUID === uid) {
          this.unset(['attributes', key]);
        }
      });

      return this;
    },

    // utils
    removeComponent(uid) {
      const { attributes } = state.schema;

      Object.keys(attributes).forEach(key => {
        const attr = attributes[key];

        if (attr.type === 'component' && attr.component === uid) {
          this.unset(['attributes', key]);
        }

        if (
          attr.type === 'dynamiczone' &&
          Array.isArray(attr.components) &&
          attr.components.includes(uid)
        ) {
          const updatedComponentList = attributes[key].components.filter(
            val => val !== uid
          );
          this.set(['attributes', key, 'components'], updatedComponentList);
        }
      });

      return this;
    },

    updateComponent(uid, newUID) {
      const { attributes } = state.schema;

      Object.keys(attributes).forEach(key => {
        const attr = attributes[key];

        if (attr.type === 'component' && attr.component === uid) {
          this.set(['attributes', key, 'component'], newUID);
        }

        if (
          attr.type === 'dynamiczone' &&
          Array.isArray(attr.components) &&
          attr.components.includes(uid)
        ) {
          const updatedComponentList = attr.components.map(val =>
            val === uid ? newUID : val
          );

          this.set(['attributes', key, 'components'], updatedComponentList);
        }
      });

      return this;
    },

    // save the schema to disk
    async flush() {
      const initialPath = path.join(initialState.dir, initialState.filename);
      const filePath = path.join(state.dir, state.filename);

      if (deleted === true) {
        await fse.remove(initialPath);

        const list = await fse.readdir(initialState.dir);
        if (list.length === 0) {
          await fse.remove(initialState.dir);
        }
      }
      if (modified === true) {
        await fse.ensureFile(filePath);
        await fse.writeJSON(filePath, state.schema, { spaces: 2 });

        // remove from oldPath
        if (initialPath !== filePath) {
          await fse.remove(initialPath);

          const list = await fse.readdir(initialState.dir);
          if (list.length === 0) {
            await fse.remove(initialState.dir);
          }
        }
      }

      return Promise.resolve();
    },

    // reset the schema to its initial value
    async rollback() {
      const initialPath = path.join(initialState.dir, initialState.filename);
      const filePath = path.join(state.dir, state.filename);

      // it was a creation so it needs to be deleted
      if (!initialState.uid) {
        await fse.remove(filePath);

        const list = await fse.readdir(state.dir);
        if (list.length === 0) {
          await fse.remove(state.dir);
        }
        return;
      }

      if (modified === true || deleted === true) {
        await fse.ensureFile(initialPath);
        await fse.writeJSON(initialPath, initialState.schema, { spaces: 2 });

        // remove
        if (initialPath !== filePath) {
          await fse.remove(filePath);

          const list = await fse.readdir(state.dir);
          if (list.length === 0) {
            await fse.remove(state.dir);
          }
        }
      }

      return Promise.resolve();
    },
  };
};
