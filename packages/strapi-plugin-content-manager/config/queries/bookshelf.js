const _ = require('lodash');

module.exports = {
  find: async function (params) {
    return this.query(function(qb) {
      _.forEach(params.where, (where, key) => {
        qb.where(key, where[0].symbol, where[0].value);
      });

      if (params.sort) {
        qb.orderBy(params.sort);
      }

      if (params.skip) {
        qb.offset(_.toNumber(params.skip));
      }

      if (params.limit) {
        qb.limit(_.toNumber(params.limit));
      }
    }).fetchAll({
      withRelated: this.associations.map(x => x.alias)
    });
  },

  count: async function (params) {
    return await this
      .forge()
      .count();
  },

  findOne: async function (params) {
    const record = await this
      .forge({
        [this.primaryKey]: params[this.primaryKey]
      })
      .fetch({
        withRelated: this.associations.map(x => x.alias)
      });

    return record ? record.toJSON() : record;
  },

  create: async function (params) {
    const entry = await this
      .forge(Object.keys(params.values).reduce((acc, current) => {
      if (this._attributes[current].type) {
        acc[current] = params.values[current];
      }

      return acc;
    }, {}))
      .save()
    .catch((err) => {
      if (err.detail) {
        const field = _.last(_.words(err.detail.split('=')[0]));
        err = { message: `This ${field} is already taken`, field };
      }

      throw err;
    });

    return module.exports.update.call(this, {
      [this.primaryKey]: entry[this.primaryKey],
      values: _.merge({
        id: entry[this.primaryKey]
      }, params.values)
    });
  },

  update: async function (params) {
    const virtualFields = [];
    const response = await module.exports.findOne.call(this, params);

    // Only update fields which are on this document.
    const values = params.parseRelationships === false ? params.values : Object.keys(JSON.parse(JSON.stringify(params.values))).reduce((acc, current) => {
      const association = this.associations.filter(x => x.alias === current)[0];
      const details = this._attributes[current];

      if (_.get(this._attributes, `${current}.isVirtual`) !== true && _.isUndefined(association)) {
        acc[current] = params.values[current];
      } else {
        switch (association.nature) {
          case 'oneWay':
            acc[current] = _.get(params.values[current], this.primaryKey, params.values[current]) || null;

            break;
          case 'oneToOne':
            if (response[current] !== params.values[current]) {
              const value = _.isNull(params.values[current]) ? response[current] : params.values;
              const recordId = _.isNull(params.values[current]) ? value[this.primaryKey] || value.id || value._id : value[current];

              if (response[current] && _.isObject(response[current]) && response[current][this.primaryKey] !== value[current]) {
                virtualFields.push(
                  strapi.query(details.collection || details.model, details.plugin).update({
                    id: response[current][this.primaryKey],
                    values: {
                      [details.via]: null
                    },
                    parseRelationships: false
                  })
                );
              }

              // Remove previous relationship asynchronously if it exists.
              virtualFields.push(
                strapi.query(details.model || details.collection, details.plugin).findOne({ id : recordId })
                  .then(record => {
                    if (record && _.isObject(record[details.via]) && record[details.via][current] !== value[current]) {
                      return module.exports.update.call(this, {
                        id: record[details.via][this.primaryKey] || record[details.via].id,
                        values: {
                          [current]: null
                        },
                        parseRelationships: false
                      });
                    }

                    return Promise.resolve();
                  })
              );

              // Update the record on the other side.
              // When params.values[current] is null this means that we are removing the relation.
              virtualFields.push(strapi.query(details.model || details.collection, details.plugin).update({
                id: recordId,
                values: {
                  [details.via]: _.isNull(params.values[current]) ? null : value[this.primaryKey] || value.id || value._id
                },
                parseRelationships: false
              }));

              acc[current] = _.isNull(params.values[current]) ? null : value[current];
            }

            break;
          case 'oneToMany':
          case 'manyToOne':
          case 'manyToMany':
            if (details.dominant === true) {
              acc[current] = params.values[current];
            } else if (response[current] && _.isArray(response[current]) && current !== 'id') {
              // Records to add in the relation.
              const toAdd = _.differenceWith(params.values[current], response[current], (a, b) =>
                a[this.primaryKey].toString() === b[this.primaryKey].toString()
              );
              // Records to remove in the relation.
              const toRemove = _.differenceWith(response[current], params.values[current], (a, b) =>
                a[this.primaryKey].toString() === b[this.primaryKey].toString()
              )
                .filter(x => toAdd.find(y => x.id === y.id) === undefined);

              // Push the work into the flow process.
              toAdd.forEach(value => {
                value[details.via] = params.values[this.primaryKey] || params[this.primaryKey];

                virtualFields.push(strapi.query(details.model || details.collection, details.plugin).addRelation({
                  id: value[this.primaryKey] || value.id || value._id,
                  values: association.nature === 'manyToMany' ? params.values : value,
                  foreignKey: current
                }));
              });

              toRemove.forEach(value => {
                value[details.via] = null;

                virtualFields.push(strapi.query(details.model || details.collection, details.plugin).removeRelation({
                  id: value[this.primaryKey] || value.id || value._id,
                  values: association.nature === 'manyToMany' ? params.values : value,
                  foreignKey: current
                }));
              });
            } else if (_.get(this._attributes, `${current}.isVirtual`) !== true) {
              acc[current] = params.values[current];
            }

            break;
          default:
        }
      }

      return acc;
    }, {});

    if (!_.isEmpty(values)) {
      virtualFields.push(this
        .forge({
          [this.primaryKey]: params[this.primaryKey]
        })
        .save(values, {
          patch: true
        }));
    } else {
      virtualFields.push(Promise.resolve(_.assign(response, params.values)));
    }

    // Update virtuals fields.
    const process = await Promise.all(virtualFields);

    return process[process.length - 1];
  },

  delete: async function (params) {
    return await this
      .forge({
        [this.primaryKey]: params.id
      })
      .destroy();
  },

  addRelation: async function (params) {
    const association = this.associations.filter(x => x.via === params.foreignKey)[0];

    if (!association) {
      // Resolve silently.
      return Promise.resolve();
    }

    switch (association.nature) {
      case 'oneToOne':
      case 'oneToMany':
      case 'manyToOne':
        return module.exports.update.call(this, params);
      case 'manyToMany':
        return this.forge({
          [this.primaryKey]: params[this.primaryKey]
        })[association.alias]().attach(params.values[this.primaryKey]);
      default:
        // Resolve silently.
        return Promise.resolve();
    }
  },

  removeRelation: async function (params) {
    const association = this.associations.filter(x => x.via === params.foreignKey)[0];

    if (!association) {
      // Resolve silently.
      return Promise.resolve();
    }

    switch (association.nature) {
      case 'oneToOne':
      case 'oneToMany':
      case 'manyToOne':
        return module.exports.update.call(this, params);
      case 'manyToMany':
        return this.forge({
          [this.primaryKey]: params[this.primaryKey]
        })[association.alias]().detach(params.values[this.primaryKey]);
      default:
        // Resolve silently.
        return Promise.resolve();
    }
  }
};
