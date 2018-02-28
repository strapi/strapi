'use strict';

/**
 * Upload.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const toArray = require('stream-to-array');
const uuid = require('uuid/v4');

module.exports = {
  bufferize: async files => {
    if (_.isEmpty(files) === 0) {
      throw 'Missing files.';
    }

    // files is always an array to map on
    files = _.isArray(files) ? files : [files];

    // transform all files in buffer
    return Promise.all(
      files.map(async stream => {
        const parts = await toArray(fs.createReadStream(stream.path));
        const buffers = parts.map(
          part => _.isBuffer(part) ? part : Buffer.from(part)
        );

        return {
          name: stream.name,
          hash: uuid().replace(/-/g, ''),
          ext: stream.name.split('.').length > 1 ? `.${_.last(stream.name.split('.'))}` : '',
          buffer: Buffer.concat(buffers),
          mime: stream.type,
          size: (stream.size / 1000).toFixed(2)
        };
      })
    );
  },

  upload: async (files, config) => {
    // Get upload provider settings to configure the provider to use.
    const provider = _.find(strapi.plugins.upload.config.providers, { provider: config.provider });
    const actions = provider.init(config);

    // Execute upload function of the provider for all files.
    return Promise.all(
      files.map(async file => {
        await actions.upload(file);

        // Remove buffer to don't save it.
        delete file.buffer;

        return await strapi.plugins['upload'].services.upload.add(file);
      })
    );
  },

  add: async (values) => {
    // Use Content Manager business logic to handle relation.
    if (strapi.plugins['content-manager']) {
      return await strapi.plugins['content-manager'].services['contentmanager'].add({
        model: 'file'
      }, values, 'upload');
    }

    return strapi.query('file', 'upload').create(values);
  },

  edit: async (params, values) => {
    // Use Content Manager business logic to handle relation.
    if (strapi.plugins['content-manager']) {
      params.model = 'file';
      params.id = (params._id || params.id);

      return await strapi.plugins['content-manager'].services['contentmanager'].edit(params, values, 'upload');
    }

    return strapi.query('file', 'upload').update(_.assign(params, values));
  },

  fetch: (params) => {
    return strapi.query('file', 'upload').findOne(_.pick(params, ['_id', 'id']));
  },

  fetchAll: (params) => {
    return strapi.query('file', 'upload').find(strapi.utils.models.convertParams('file', params));
  },

  count: async (params, source) => {
    return await strapi.query('file', 'upload').count();
  },

  remove: async (params, config) => {
    const file = await strapi.plugins['upload'].services.upload.fetch(params);

    // get upload provider settings to configure the provider to use
    const provider = _.cloneDeep(_.find(strapi.plugins.upload.config.providers, {provider: config.provider}));
    _.assign(provider, config);
    const actions = provider.init(strapi, config);

    // execute delete function of the provider
    await actions.delete(file);

    // Use Content Manager business logic to handle relation.
    if (strapi.plugins['content-manager']) {
      params.model = 'file';
      params.id = (params._id || params.id);

      await strapi.plugins['content-manager'].services['contentmanager'].delete(params, {source: 'upload'});
    }

    return strapi.query('file', 'upload').delete(params);
  },

  attachToEntity: async function (params, files, source) {
    const config = await strapi.store({
      environment: strapi.config.environment,
      type: 'plugin',
      name: 'upload'
    }).get({ key: 'provider' });

    // Retrieve primary key.
    // const primaryKey = strapi.query(params.model, source).primaryKey;

    // Delete removed files.
    // const entry =  await strapi.query(params.model, source).findOne({
    //   id: params.id
    // });

    // const model = source && source !== 'content-manager' ?
    //   strapi.plugins[source].models[params.model]:
    //   strapi.models[params.model];

    // const arrayOfPromises = [];

    // model.associations
    //   .filter(association => association.via === 'related')
    //   .forEach(association => {
    //     // Remove deleted files.
    //     if (parsedFields[association.alias]) {
    //       const transformToArrayID = (array) => {
    //         return _.isArray(array) ? array.map(value => {
    //           if (_.isPlainObject(value)) {
    //             return value[primaryKey];
    //           }
    //
    //           return value;
    //         }) : array;
    //       };
    //
    //       // Compare array of ID to find deleted files.
    //       const currentValue = transformToArrayID(parsedFields[association.alias]).map(id => id.toString());
    //       const storedValue = transformToArrayID(entry[association.alias]).map(id => id.toString());
    //
    //       const removeRelations = _.difference(storedValue, currentValue);
    //
    //       // console.log("Current", currentValue);
    //       // console.log("Stored", storedValue);
    //       // console.log("removeRelations", removeRelations);
    //
    //       removeRelations.forEach(id => {
    //         arrayOfPromises.push(strapi.plugins.upload.services.upload.edit({
    //           id
    //         }, {
    //           related: []
    //         }))
    //       });
    //
    //       // TODO:
    //       // - Remove relationships in files.
    //     }
    //   });

    await Promise.all(
      Object.keys(files)
        .map(async attribute => {
          // Bufferize files per attribute.
          const buffers = await this.bufferize(files[attribute]);
          const enhancedFiles = buffers.map(file => {
            // Add related information to be able to make
            // the relationships later.
            file.related = [{
              refId: params.id,
              ref: params.model,
              source,
              field: attribute,
            }];

            return file;
          });

          // Make upload async.
          return this.upload(enhancedFiles, config);
        })
    );
  }
};
