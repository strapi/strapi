const _ = require('lodash');

module.exports = {
  find: async function (params, populate, raw = false) {
    return this.query(function(qb) {
      _.forEach(params.where, (where, key) => {
        if (_.isArray(where.value) && where.symbol !== 'IN') {
          for (const value in where.value) {
            qb[value ? 'where' : 'orWhere'](key, where.symbol, where.value[value]);
          }
        } else {
          qb.where(key, where.symbol, where.value);
        }
      });

      if (params.sort) {
        qb.orderBy(params.sort.key, params.sort.order);
      }

      if (params.skip) {
        qb.offset(_.toNumber(params.skip));
      }

      if (params.limit) {
        qb.limit(_.toNumber(params.limit));
      }
    }).fetchAll({
      withRelated: populate || this.associations.map(x => x.alias)
    }).then(data => raw ? data.toJSON() : data);
  },

  count: async function (params = {}) {
    return await this
      .forge()
      .query(qb => {
        _.forEach(params.where, (where, key) => {
          if (_.isArray(where.value)) {
            for (const value in where.value) {
              qb[value ? 'where' : 'orWhere'](key, where.symbol, where.value[value]);
            }
          } else {
            qb.where(key, where.symbol, where.value);
          }
        });
      })
      .count();
  },

  search: async function (params, populate, raw = false) {
    const associations = this.associations.map(x => x.alias);
    const searchText = Object.keys(this._attributes)
      .filter(attribute => attribute !== this.primaryKey && !associations.includes(attribute))
      .filter(attribute => ['string', 'text'].includes(this._attributes[attribute].type));

    const searchNoText = Object.keys(this._attributes)
      .filter(attribute => attribute !== this.primaryKey && !associations.includes(attribute))
      .filter(attribute => !['string', 'text', 'boolean', 'integer', 'decimal', 'float'].includes(this._attributes[attribute].type));

    const searchInt = Object.keys(this._attributes)
      .filter(attribute => attribute !== this.primaryKey && !associations.includes(attribute))
      .filter(attribute => ['integer', 'decimal', 'float'].includes(this._attributes[attribute].type));

    const searchBool = Object.keys(this._attributes)
      .filter(attribute => attribute !== this.primaryKey && !associations.includes(attribute))
      .filter(attribute => ['boolean'].includes(this._attributes[attribute].type));

    const query = (params.search || '').replace(/[^a-zA-Z0-9.-\s]+/g, '');

    return this.query(qb => {
      // Search in columns which are not text value.
      searchNoText.forEach(attribute => {
        qb.orWhereRaw(`LOWER(${attribute}) LIKE '%${_.toLower(query)}%'`);
      });

      if (!_.isNaN(_.toNumber(query))) {
        searchInt.forEach(attribute => {
          qb.orWhereRaw(`${attribute} = ${_.toNumber(query)}`);
        });
      }

      if (query === 'true' || query === 'false') {
        searchBool.forEach(attribute => {
          qb.orWhereRaw(`${attribute} = ${_.toNumber(query === 'true')}`);
        });
      }

      // Search in columns with text using index.
      switch (this.client) {
        case 'pg': {
          const searchQuery = searchText.map(attribute =>
            _.toLower(attribute) === attribute
              ? `to_tsvector(${attribute})`
              : `to_tsvector('${attribute}')`
          );

          qb.orWhereRaw(`${searchQuery.join(' || ')} @@ to_tsquery(?)`, query);
          break;
        }
        default:
          qb.orWhereRaw(`MATCH(${searchText.join(',')}) AGAINST(? IN BOOLEAN MODE)`, `*${query}*`);
          break;
      }

      if (params.sort) {
        qb.orderBy(params.sort.key, params.sort.order);
      }

      if (params.skip) {
        qb.offset(_.toNumber(params.skip));
      }

      if (params.limit) {
        qb.limit(_.toNumber(params.limit));
      }
    }).fetchAll({
      width: populate || associations
    }).then(data => raw ? data.toJSON() : data);
  },

  countSearch: async function (params = {}) {
    const associations = this.associations.map(x => x.alias);
    const searchText = Object.keys(this._attributes)
      .filter(attribute => attribute !== this.primaryKey && !associations.includes(attribute))
      .filter(attribute => ['string', 'text'].includes(this._attributes[attribute].type));

    const searchNoText = Object.keys(this._attributes)
      .filter(attribute => attribute !== this.primaryKey && !associations.includes(attribute))
      .filter(attribute => !['string', 'text', 'boolean', 'integer', 'decimal', 'float'].includes(this._attributes[attribute].type));

    const searchInt = Object.keys(this._attributes)
      .filter(attribute => attribute !== this.primaryKey && !associations.includes(attribute))
      .filter(attribute => ['integer', 'decimal', 'float'].includes(this._attributes[attribute].type));

    const searchBool = Object.keys(this._attributes)
      .filter(attribute => attribute !== this.primaryKey && !associations.includes(attribute))
      .filter(attribute => ['boolean'].includes(this._attributes[attribute].type));

    const query = (params.search || '').replace(/[^a-zA-Z0-9.-\s]+/g, '');


    return this.query(qb => {
      // Search in columns which are not text value.
      searchNoText.forEach(attribute => {
        qb.orWhereRaw(`LOWER(${attribute}) LIKE '%${_.toLower(query)}%'`);
      });

      if (!_.isNaN(_.toNumber(query))) {
        searchInt.forEach(attribute => {
          qb.orWhereRaw(`${attribute} = ${_.toNumber(query)}`);
        });
      }

      if (query === 'true' || query === 'false') {
        searchBool.forEach(attribute => {
          qb.orWhereRaw(`${attribute} = ${_.toNumber(query === 'true')}`);
        });
      }

      // Search in columns with text using index.
      switch (this.client) {
        case 'pg': {
          const searchQuery = searchText.map(attribute =>
            _.toLower(attribute) === attribute
              ? `to_tsvector(${attribute})`
              : `to_tsvector('${attribute}')`
          );

          qb.orWhereRaw(`${searchQuery.join(' || ')} @@ to_tsquery(?)`, query);
          break;
        }
        default:
          qb.orWhereRaw(`MATCH(${searchText.join(',')}) AGAINST(? IN BOOLEAN MODE)`, `*${query}*`);
          break;
      }
    }).count();
  },

  findOne: async function (params, populate) {
    const record = await this
      .forge({
        [this.primaryKey]: params[this.primaryKey]
      })
      .fetch({
        withRelated: populate || this.associations.map(x => x.alias)
      });

    const data = _.get(record, 'toJSON()', record);

    // Retrieve data manually.
    if (_.isEmpty(populate)) {
      const arrayOfPromises = this.associations
        .filter(association => ['manyMorphToOne', 'manyMorphToMany'].includes(association.nature))
        .map(association => { // eslint-disable-line no-unused-vars
          return this.morph.forge()
            .where({
              [`${this.collectionName}_id`]: params[this.primaryKey]
            })
            .fetchAll();
        });

      const related = await Promise.all(arrayOfPromises);

      related.forEach((value, index) => {
        data[this.associations[index].alias] = value ? value.toJSON() : value;
      });
    }

    return data;
  },

  create: async function (params) {
    // Exclude relationships.
    const values = Object.keys(params.values).reduce((acc, current) => {
      if (this._attributes[current] && this._attributes[current].type) {
        acc[current] = params.values[current];
      }

      return acc;
    }, {});

    const request = await this
      .forge(values)
      .save()
      .catch((err) => {
        if (err.detail) {
          const field = _.last(_.words(err.detail.split('=')[0]));
          err = { message: `This ${field} is already taken`, field };
        }

        throw err;
      });

    const entry = request.toJSON ? request.toJSON() : request;

    const relations = this.associations.reduce((acc, association) => {
      acc[association.alias] = params.values[association.alias];
      return acc;
    }, {});

    return module.exports.update.call(this, {
      [this.primaryKey]: entry[this.primaryKey],
      values: _.assign({
        id: entry[this.primaryKey]
      }, relations)
    });
  },

  update: async function (params) {
    // Call the business logic located in the hook.
    // This function updates no-relational and relational data.
    return this.updateRelations(params);
  },

  delete: async function (params) {
    return await this
      .forge({
        [this.primaryKey]: params.id
      })
      .destroy();
  },

  deleteMany: async function (params) {
    return await this
      .query(function(qb) {
        return qb.whereIn('id', params.id);
      })
      .destroy();
  }
};
