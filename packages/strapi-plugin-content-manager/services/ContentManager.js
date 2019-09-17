'use strict';

const _ = require('lodash');
const uploadFiles = require('../utils/upload-files');
/**
 * A set of functions called "actions" for `ContentManager`
 */
module.exports = {
  fetch(params, source, populate) {
    return strapi
      .query(params.model, source)
      .findOne({ id: params.id }, populate);
  },

  fetchAll(params, query) {
    const { query: request, source, populate, ...filters } = query;

    const queryFilter = !_.isEmpty(request)
      ? {
          ...filters, // Filters is an object containing the limit/sort and start
          ...request,
        }
      : filters;

    // Find entries using `queries` system
    return strapi.query(params.model, source).find(queryFilter, populate);
  },

  count(params, query) {
    const { source, ...filters } = query;
    return strapi.query(params.model, source).count(filters);
  },

  async createMultipart(data, { files = {}, model, source } = {}) {
    const entry = await strapi.query(model, source).create(data);

    await uploadFiles(entry, files, { model, source });

    return strapi.query(model, source).findOne({ id: entry.id });
  },

  async create(data, { files, model, source } = {}) {
    const entry = await strapi.query(model, source).create(data);

    if (files) {
      await uploadFiles(entry, files, { model, source });
      return strapi.query(model, source).findOne({ id: entry.id });
    }

    return entry;
  },

  async edit(params, data, { model, source, files } = {}) {
    const entry = await strapi
      .query(model, source)
      .update({ id: params.id }, data);

    if (files) {
      await uploadFiles(entry, files, { model, source });
      return strapi.query(model, source).findOne({ id: entry.id });
    }

    return entry;
  },

 async delete(params, { source }) {
    const { primaryKey, associations } = strapi.query(params.model, source);
     const uploadRelations = _.map(
      associations.filter(obj => obj.plugin == 'upload'),
      'alias'
    );


    if (uploadRelations.length > 0) {
       const filter = { [`${primaryKey}_in`]: [params.id], _limit: 100 };
    await this.deleteManyFiles(uploadRelations, filter, params.model, source, primaryKey);
    
    }
      return strapi.query(params.model, source).delete({ id: params.id });
    


    
  },

  async deleteMany(params, query) {
    const { source } = query;
    const { model } = params;

    const toRemove = Object.values(_.omit(query, 'source'));

    const { primaryKey, associations } = strapi.query(model, source);

    const uploadRelations = _.map(
      associations.filter(obj => obj.plugin == 'upload'),
      'alias'
    );

    const filter = { [`${primaryKey}_in`]: toRemove, _limit: 100 };

    if (uploadRelations.length > 0) {
     await  this.deleteManyFiles(uploadRelations, filter, model, source, primaryKey);
      
    } 
      return strapi.query(model, source).delete(filter);
    
  },

  
  search(params, query) {
    const { model } = params;
    const { source } = query;

    return strapi.query(model, source).search(query);
  },

  countSearch(params, query) {
    const { model } = params;
    const { source, _q } = query;
    return strapi.query(model, source).countSearch({ _q });
  },


  async deleteManyFiles(uploadRelations, filter, model, source, primaryKey) {
    const fields = await strapi.query(model, source).find(filter);
    let ids = fields.map(field => {
      return _.map(
        uploadRelations.map(uploadRelation => field[`${uploadRelation}`]),
        `${primaryKey}`
      ).filter(e => e != null);
    });
    ids = [].concat(...ids);

    const filterUpload = { [`${primaryKey}_in`]: ids, _limit: 100 };

    const files = await strapi.query('file', 'upload').find(filterUpload);
    const config = await strapi
      .store({
        environment: strapi.config.environment,
        type: 'plugin',
        name: 'upload'
      })
      .get({ key: 'provider' });

    const provider = _.cloneDeep(
      _.find(strapi.plugins.upload.config.providers, {
        provider: config.provider
      })
    );
    _.assign(provider, config);
    const actions = provider.init(config);

    let fileIds = files.map(file => file.id);

    const deleteFile = async file => {
      if (file.provider === provider.provider) {
        await actions.delete(file);
      }
    };
    Promise.all(files.map(file => deleteFile(file)));
    await strapi
      .query('file', 'upload')
      .delete({ [`${primaryKey}_in`]: fileIds, _limit: 100 });
  },
};
