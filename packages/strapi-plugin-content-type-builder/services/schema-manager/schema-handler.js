'use strict';

const path = require('path');
const fse = require('fs-extra');
const _ = require('lodash');

module.exports = function createSchemaHandler(infos) {
  const uid = infos.uid;
  const dir = infos.dir;
  const filename = infos.filename;

  // always keep it the same to rollback
  let initialSchema = Object.freeze(infos.schema);
  let schema = _.cloneDeep(infos.schema) || {};

  let modified = false;
  let deleted = false;

  return {
    uid,
    dir,
    filename,

    // Flag schema for deletion
    delete() {
      deleted = true;
    },

    // get a copy of the full schema
    get schema() {
      return _.cloneDeep(schema);
    },

    // set a new schema object
    set schema(val) {
      modified = true;
      schema = _.cloneDeep(val);
    },

    // get a particuar path inside the schema
    get(path) {
      return _.get(schema, path);
    },

    // set a particuar path inside the schema
    set(path, val) {
      modified = true;

      _.set(schema, path, val || _.get(schema, path));

      return this;
    },

    // delete a particuar path inside the schema
    unset(path) {
      modified = true;

      _.unset(schema, path);

      return this;
    },

    // utils
    removeComponent(uid) {
      Object.keys(schema.attributes).forEach(key => {
        const attr = schema.attributes[key];

        if (attr.type === 'component' && attr.component === uid) {
          this.unset(['attributes', key]);
        }

        if (
          attr.type === 'dynamiczone' &&
          Array.isArray(attr.components) &&
          attr.components.includes(uid)
        ) {
          const updatedComponentList = schema.attributes[key].components.filter(
            val => val !== uid
          );
          this.set(['attributes', key, 'components'], updatedComponentList);
        }
      });

      return this;
    },

    // save the schema to disk
    async flush() {
      const filePath = path.join(dir, filename);

      if (deleted === true) {
        await fse.remove(filePath);

        const list = await fse.readdir(dir);
        if (list.length === 0) {
          await fse.remove(dir);
        }
      }

      if (modified === true) {
        await fse.ensureFile(filePath);
        return fse.writeJSON(filePath, schema, { spaces: 2 });
      }

      return Promise.resolve();
    },

    // reset the schema to its initial value
    async rollback() {
      const filePath = path.join(dir, filename);

      // it was a creation so it needs to be deleted
      if (!uid) {
        await fse.remove(filePath);

        const list = await fse.readdir(dir);
        if (list.length === 0) {
          await fse.remove(dir);
        }
        return;
      }

      if (modified === true || deleted === true) {
        await fse.ensureFile(filePath);
        return fse.writeJSON(filePath, initialSchema, { spaces: 2 });
      }

      return Promise.resolve();
    },
  };
};
