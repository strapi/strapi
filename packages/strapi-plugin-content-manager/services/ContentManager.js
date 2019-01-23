'use strict';

const _ = require('lodash');

/**
 * A set of functions called "actions" for `ContentManager`
 */

module.exports = {
  fetchAll: async (params, query) => {
    const { limit, skip, sort, query : request, queryAttribute, source, populate = [] } = query;
    const filters = strapi.utils.models.convertParams(params.model, query);
    const where = !_.isEmpty(request) ? request : filters.where;

    // Find entries using `queries` system
    return await strapi.query(params.model, source).find({
      limit: limit || filters.limit,
      skip: skip || filters.start || 0,
      sort: sort || filters.sort,
      where,
      queryAttribute,
    }, populate);
  },

  search: async (params, query) => {
    const { limit, skip, sort, source, _q, populate = [] } = query; // eslint-disable-line no-unused-vars
    const filters = strapi.utils.models.convertParams(params.model, query);

    // Find entries using `queries` system
    return await strapi.query(params.model, source).search({
      limit: limit || filters.limit,
      skip: skip || filters.start || 0,
      sort: sort || filters.sort,
      search: _q
    }, populate);
  },

  countSearch: async (params, query) => {
    const { source, _q } = query;

    return await strapi.query(params.model, source).countSearch({ search: _q });
  },

  count: async (params, query) => {
    const { source } = query;
    const filters = strapi.utils.models.convertParams(params.model, query);

    return await strapi.query(params.model, source).count({ where: filters.where });
  },

  fetch: async (params, source, populate, raw = true) => {
    return await strapi.query(params.model, source).findOne({
      id: params.id
    }, populate, raw);
  },

  add: async (params, values, source) => {
    // Multipart/form-data.
    if (values.hasOwnProperty('fields') && values.hasOwnProperty('files')) {
      // Silent recursive parser.
      const parser = (value) => {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // Silent.
        }

        return _.isArray(value) ? value.map(obj => parser(obj)) : value;
      };

      const files = values.files;

      // Parse stringify JSON data.
      values = Object.keys(values.fields).reduce((acc, current) => {
        acc[current] = parser(values.fields[current]);

        return acc;
      }, {});

      // Update JSON fields.
      const entry = await strapi.query(params.model, source).create({
        values
      });

      // Then, request plugin upload.
      if (strapi.plugins.upload && Object.keys(files).length > 0) {
        // Upload new files and attach them to this entity.
        await strapi.plugins.upload.services.upload.uploadToEntity({
          id: entry.id || entry._id,
          model: params.model
        }, files, source);
      }

      return strapi.query(params.model, source).findOne({
        id: entry.id || entry._id
      });
    }

    // Create an entry using `queries` system
    return await strapi.query(params.model, source).create({
      values
    });
  },

  edit: async (params, values, source) => {
    // Multipart/form-data.
    if (values.hasOwnProperty('fields') && values.hasOwnProperty('files')) {
      // Silent recursive parser.
      const parser = (value) => {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // Silent.
        }

        return _.isArray(value) ? value.map(obj => parser(obj)) : value;
      };

      const files = values.files;

      // set empty attributes if old values was cleared
      _.difference(Object.keys(files), Object.keys(values.fields)).forEach(attr => {
        values.fields[attr] = [];
      });

      // Parse stringify JSON data.
      values = Object.keys(values.fields).reduce((acc, current) => {
        acc[current] = parser(values.fields[current]);

        return acc;
      }, {});

      // Update JSON fields.
      await strapi.query(params.model, source).update({
        id: params.id,
        values
      });

      // Then, request plugin upload.
      if (strapi.plugins.upload) {
        // Upload new files and attach them to this entity.
        await strapi.plugins.upload.services.upload.uploadToEntity(params, files, source);
      }

      return strapi.query(params.model, source).findOne({
        id: params.id
      });
    }

    // Raw JSON.
    return strapi.query(params.model, source).update({
      id: params.id,
      values
    });
  },

  delete: async (params, { source }) => {
    const query = strapi.query(params.model, source);
    const primaryKey = query.primaryKey;
    const response = await query.findOne({
      id: params.id
    });

    if (!response) {
      throw `This resource doesn't exist.`;
    }

    params[primaryKey] = response[primaryKey];
    params.values = Object.keys(JSON.parse(JSON.stringify(response))).reduce((acc, current) => {
      const association = (strapi.models[params.model] || strapi.plugins[source].models[params.model]).associations.filter(x => x.alias === current)[0];

      // Remove relationships.
      if (association) {
        acc[current] = _.isArray(response[current]) ? [] : null;
      }

      return acc;
    }, {});

    if (!_.isEmpty(params.values)) {
      // Run update to remove all relationships.
      await strapi.query(params.model, source).update(params);
    }

    // Delete an entry using `queries` system
    return await strapi.query(params.model, source).delete({
      id: params.id
    });
  },

  deleteMany: async (params, query) => {
    const { source } = query;
    const { model } = params;

    const primaryKey = strapi.query(model, source).primaryKey;
    const toRemove = Object.keys(query).reduce((acc, curr) => {
      if (curr !== 'source') {
        return acc.concat([query[curr]]);
      }

      return acc;
    }, []);

    const filters = strapi.utils.models.convertParams(model, { [`${primaryKey}_in`]: toRemove });
    const entries = await strapi.query(model, source).find({ where: filters.where }, null, true);
    const associations = strapi.query(model, source).associations;

    for (let i = 0; i < entries.length; ++i) {
      const entry = entries[i];

      associations.forEach(association => {
        if (entry[association.alias]) {
          switch (association.nature) {
            case 'oneWay':
            case 'oneToOne':
            case 'manyToOne':
            case 'oneToManyMorph':
              entry[association.alias] = null;
              break;
            case 'oneToMany':
            case 'manyToMany':
            case 'manyToManyMorph':
              entry[association.alias] = [];
              break;
            default:
          }
        }
      });

      await strapi.query(model, source).update({
        [primaryKey]: entry[primaryKey],
        values: _.pick(entry, associations.map(a => a.alias))
      });
    }

    return strapi.query(model, source).deleteMany({
      [primaryKey]: toRemove,
    });
  }
};
