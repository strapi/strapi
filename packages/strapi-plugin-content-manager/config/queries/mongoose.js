const _ = require('lodash');

module.exports = {
  find: async function (params) {
    return this
      .find()
      .limit(Number(params.limit))
      .sort(params.sort)
      .skip(Number(params.skip));
  },

  count: async function (params) {
    return Number(await this
      .count());
  },

  findOne: async function (params) {
    return this
      .findOne({
        [this.primaryKey]: params.id
      })
      .populate(this.associations.map(x => x.alias).join(' '));
  },

  create: async function (params) {
    return this
      .create(params.values);
  },

  update: async function (params) {
    const virtualFields = [];
    const response = await module.exports.findOne.call(this, params);

    console.log();
    console.log("UPDATE");
    console.log(params);
    console.log(response);

    console.log(this.associations);
    console.log();

    // Only update fields which are on this document.
    const values = Object.keys(JSON.parse(JSON.stringify(params.values))).reduce((acc, current) => {
      const association = this.associations.filter(x => x.alias === current)[0];
      const details = this._attributes[current];

      if (_.get(this._attributes, `${current}.isVirtual`) !== true && _.isUndefined(association)) {
        acc[current] = params.values[current];
      } else {
        switch (association.nature) {
          case 'oneToOne':
            if (!_.isUndefined(response[current]) && response[current] !== params.values[current]) {
              const value = _.isNull(response[current]) ? params.values : response[current];

              delete value[details.via];

              // Update the record on the other side.
              // When params.values[current] is null this means that we are removing the relation.
              virtualFields.push(strapi.query(details.model || details.collection).update({
                id: _.isNull(params.values[current]) ? value[this.primaryKey] || value.id || value._id : params.values[current],
                values: {
                  [details.via]: _.isNull(params.values[current]) ? null : value[this.primaryKey] || value.id || value._id
                }
              }));

              acc[current] = _.isNull(params.values[current]) ? null : params.values[current];
            }

            break;
          case 'oneToMany':
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

              console.log("ADD");
              console.log(toAdd);
              console.log("REMOVE");
              console.log(toRemove);
              console.log('-----------');

              // Push the work into the flow process.
              toAdd.forEach(value => {
                if (association.nature === 'manyToMany' && !_.isArray(params.values[this.primaryKey])) {
                  value[details.via] = (response[current] === null ? [] : response[current]).concat([params.values[this.primaryKey]]);
                } else {
                  value[details.via] = params.values[this.primaryKey];
                }

                virtualFields.push(strapi.query(details.model || details.collection).addRelation({
                  id: value[this.primaryKey] || value.id || value._id,
                  values: value,
                  foreignKey: current
                }));
              });

              toRemove.forEach(value => {
                if (association.nature === 'manyToMany' && !_.isArray(params.values[this.primaryKey])) {
                  value[details.via] = value[details.via].filter(x => x.toString() !== params.values[this.primaryKey].toString());
                } else {
                  value[details.via] = params.values[this.primaryKey];
                }

                virtualFields.push(strapi.query(details.model || details.collection).removeRelation({
                  id: value[this.primaryKey] || value.id || value._id,
                  values: value,
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

    console.log(values);

    virtualFields.push(this
      .update({
        [this.primaryKey]: params.id
      }, values, {
        strict: false
      }));

    // Update virtuals fields.
    const process = await Promise.all(virtualFields);

    return process[process.length - 1];
  },

  delete: async function (params) {
    return this
      .remove({
        [this.primaryKey]: params.id
      });
  },

  addRelation: async function (params) {
    return module.exports.update.call(this, params);
  },

  removeRelation: async function (params) {
    return module.exports.update.call(this, params);
  }
};
