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
    return await this
      .create(params.values);
  },

  update: async function (params) {
    const virtualFields = [];

    const record = await module.exports.findOne.call(this, params);
    const response = record ? record.toJSON() : {};

    // Only update fields which are on this document.
    const values = Object.keys(params.values).reduce((acc, current) => {
      if (!this.schema.virtuals.hasOwnProperty(current)) {
        acc[current] = params.values[current];
      } else if (response.hasOwnProperty(current) && current !== 'id'){
        const details = this.attributes[current];

        const toAdd = _.differenceWith(params.values[current], response[current], _.isEqual);
        const toRemove = _.differenceWith(response[current], params.values[current],  _.isEqual);

        toAdd.forEach(value => {
          value[details.via] = params.values[this.primaryKey];

          virtualFields.push(strapi.query(details.model || details.collection).update({
            id: value.id || value[this.primaryKey] || '_id',
            values: value
          }));
        });

        toRemove.forEach(value => {
          value[details.via] = null;

          virtualFields.push(strapi.query(details.model || details.collection).update({
            id: value.id || value[this.primaryKey] || '_id',
            values: value
          }));
        });
      }

      return acc;
    }, {});

    // Add current model to the flow of updates.
    virtualFields.push(this
      .update({
        [this.primaryKey]: params.id
      }, values, {
        strict: false
      }));

    // Update virtuals fields.
    return await Promise.all(virtualFields);
  },

  delete: async function (params) {
    return await this
      .remove({
        [this.primaryKey]: params.id
      });
  }
};
