'use strict';
/**
 * Implementation of model queries for mongo
 */

const _ = require('lodash');
const {
  convertRestQueryParams,
  buildQuery,
  models: modelUtils,
} = require('strapi-utils');

module.exports = ({ model, modelKey, strapi }) => {
  const hasPK = obj => _.has(obj, model.primaryKey) || _.has(obj, 'id');
  const getPK = obj =>
    _.has(obj, model.primaryKey) ? obj[model.primaryKey] : obj.id;

  const assocKeys = model.associations.map(ast => ast.alias);
  const groupKeys = Object.keys(model.attributes).filter(key => {
    return model.attributes[key].type === 'group';
  });
  const excludedKeys = assocKeys.concat(groupKeys);

  const defaultPopulate = model.associations
    .filter(ast => ast.autoPopulate !== false)
    .map(ast => ast.alias);

  const pickRelations = values => {
    return _.pick(values, assocKeys);
  };

  const omitExernalValues = values => {
    return _.omit(values, excludedKeys);
  };

  async function createGroups(entry, values) {
    if (groupKeys.length === 0) return;

    for (let key of groupKeys) {
      const attr = model.attributes[key];
      const { group, required = false, repeatable = false } = attr;

      const groupModel = strapi.groups[group];

      if (required === true && !_.has(values, key)) {
        const err = new Error(`Group ${key} is required`);
        err.status = 400;
        throw err;
      }

      if (!_.has(values, key)) continue;

      const groupValue = values[key];

      if (repeatable === true) {
        validateRepeatableInput(groupValue, { key, ...attr });
        const groups = await Promise.all(
          groupValue.map(value => {
            return strapi.query(group).create(value);
          })
        );

        const groupsArr = groups.map(groupEntry => ({
          kind: groupModel.globalId,
          ref: groupEntry,
        }));

        entry[key] = groupsArr;
        await entry.save();
      } else {
        validateNonRepeatableInput(groupValue, { key, ...attr });
        if (groupValue === null) continue;

        const groupEntry = await strapi.query(group).create(groupValue);
        entry[key] = [
          {
            kind: groupModel.globalId,
            ref: groupEntry,
          },
        ];
        await entry.save();
      }
    }
  }

  async function updateGroups(entry, values) {
    if (groupKeys.length === 0) return;

    for (let key of groupKeys) {
      // if key isn't present then don't change the current group data
      if (!_.has(values, key)) continue;

      const attr = model.attributes[key];
      const { group, repeatable = false } = attr;

      const groupModel = strapi.groups[group];
      const groupValue = values[key];

      const updateOrCreateGroup = async value => {
        // check if value has an id then update else create
        if (hasPK(value)) {
          return strapi.query(group).update(
            {
              [model.primaryKey]: getPK(value),
            },
            value
          );
        }
        return strapi.query(group).create(value);
      };

      if (repeatable === true) {
        validateRepeatableInput(groupValue, { key, ...attr });

        await deleteOldGroups(entry, groupValue, { key, groupModel });

        const groups = await Promise.all(groupValue.map(updateOrCreateGroup));
        const groupsArr = groups.map(group => ({
          kind: groupModel.globalId,
          ref: group,
        }));

        entry[key] = groupsArr;
        await entry.save();
      } else {
        validateNonRepeatableInput(groupValue, { key, ...attr });

        await deleteOldGroups(entry, groupValue, { key, groupModel });

        if (groupValue === null) continue;

        const group = await updateOrCreateGroup(groupValue);
        entry[key] = [
          {
            kind: groupModel.globalId,
            ref: group,
          },
        ];
        await entry.save();
      }
    }
    return;
  }

  async function deleteOldGroups(entry, groupValue, { key, groupModel }) {
    const groupArr = Array.isArray(groupValue) ? groupValue : [groupValue];

    const idsToKeep = groupArr.filter(hasPK).map(getPK);
    const allIds = await (entry[key] || [])
      .filter(el => el.ref)
      .map(el => el.ref._id);

    // verify the provided ids are realted to this entity.
    idsToKeep.forEach(id => {
      if (allIds.findIndex(currentId => currentId.toString() === id) === -1) {
        const err = new Error(
          `Some of the provided groups in ${key} are not related to the entity`
        );
        err.status = 400;
        throw err;
      }
    });

    const idsToDelete = allIds.reduce((acc, id) => {
      if (idsToKeep.includes(id.toString())) return acc;
      return acc.concat(id);
    }, []);

    if (idsToDelete.length > 0) {
      await strapi
        .query(groupModel.uid)
        .delete({ [`${model.primaryKey}_in`]: idsToDelete });
    }
  }

  async function deleteGroups(entry) {
    if (groupKeys.length === 0) return;

    for (let key of groupKeys) {
      const attr = model.attributes[key];
      const { group } = attr;
      const groupModel = strapi.groups[group];

      if (Array.isArray(entry[key]) && entry[key].length > 0) {
        const idsToDelete = entry[key].map(el => el.ref);
        await strapi
          .query(groupModel.uid)
          .delete({ [`${model.primaryKey}_in`]: idsToDelete });
      }
    }
  }

  function find(params, populate) {
    const populateOpt = populate || defaultPopulate;

    const filters = convertRestQueryParams(params);

    return buildQuery({
      model,
      filters,
      populate: populateOpt,
    }).then(results =>
      results.map(result => (result ? result.toObject() : null))
    );
  }

  async function findOne(params, populate) {
    const primaryKey = getPK(params);

    if (primaryKey) {
      params = {
        [model.primaryKey]: primaryKey,
      };
    }

    const entry = await model
      .findOne(params)
      .populate(populate || defaultPopulate);

    return entry ? entry.toObject() : null;
  }

  function count(params) {
    const filters = convertRestQueryParams(params);

    return buildQuery({
      model,
      filters: { where: filters.where },
    }).count();
  }

  async function create(values) {
    // Extract values related to relational data.
    const relations = pickRelations(values);
    const data = omitExernalValues(values);

    // Create entry with no-relational data.
    const entry = await model.create(data);

    await createGroups(entry, values);

    // Create relational data and return the entry.
    return model.updateRelations({
      [model.primaryKey]: getPK(entry),
      values: relations,
    });
  }

  async function update(params, values) {
    const primaryKey = getPK(params);

    if (primaryKey) {
      params = {
        [model.primaryKey]: primaryKey,
      };
    }

    const entry = await model.findOne(params);

    if (!entry) {
      const err = new Error('entry.notFound');
      err.status = 404;
      throw err;
    }

    // Extract values related to relational data.
    const relations = pickRelations(values);
    const data = omitExernalValues(values);

    // update groups first in case it fails don't update the entity
    await updateGroups(entry, values);
    // Update entry with no-relational data.
    await entry.updateOne(data);

    // Update relational data and return the entry.
    return model.updateRelations(Object.assign(params, { values: relations }));
  }

  async function deleteMany(params) {
    const primaryKey = getPK(params);

    if (primaryKey) return deleteOne(params);

    const entries = await find(params);
    return await Promise.all(entries.map(entry => deleteOne({ id: entry.id })));
  }

  async function deleteOne(params) {
    const entry = await model
      .findOneAndRemove({ [model.primaryKey]: getPK(params) })
      .populate(defaultPopulate);

    if (!entry) {
      const err = new Error('entry.notFound');
      err.status = 404;
      throw err;
    }

    await deleteGroups(entry);

    await Promise.all(
      model.associations.map(async association => {
        if (!association.via || !entry._id || association.dominant) {
          return true;
        }

        const search =
          _.endsWith(association.nature, 'One') ||
          association.nature === 'oneToMany'
            ? { [association.via]: entry._id }
            : { [association.via]: { $in: [entry._id] } };
        const update =
          _.endsWith(association.nature, 'One') ||
          association.nature === 'oneToMany'
            ? { [association.via]: null }
            : { $pull: { [association.via]: entry._id } };

        // Retrieve model.
        const model = association.plugin
          ? strapi.plugins[association.plugin].models[
              association.model || association.collection
            ]
          : strapi.models[association.model || association.collection];

        return model.updateMany(search, update);
      })
    );

    return entry.toObject ? entry.toObject() : null;
  }

  function search(params, populate) {
    // Convert `params` object to filters compatible with Mongo.
    const filters = modelUtils.convertParams(modelKey, params);

    const $or = buildSearchOr(model, params._q);

    return model
      .find({ $or })
      .sort(filters.sort)
      .skip(filters.start)
      .limit(filters.limit)
      .populate(populate || defaultPopulate)
      .then(results =>
        results.map(result => (result ? result.toObject() : null))
      );
  }

  function countSearch(params) {
    const $or = buildSearchOr(model, params._q);
    return model.find({ $or }).countDocuments();
  }

  return {
    findOne,
    find,
    create,
    update,
    delete: deleteMany,
    count,
    search,
    countSearch,
  };
};

const buildSearchOr = (model, query) => {
  return Object.keys(model.attributes).reduce((acc, curr) => {
    switch (model.attributes[curr].type) {
      case 'integer':
      case 'float':
      case 'decimal':
        if (!_.isNaN(_.toNumber(query))) {
          return acc.concat({ [curr]: query });
        }

        return acc;
      case 'string':
      case 'text':
      case 'password':
        return acc.concat({ [curr]: { $regex: query, $options: 'i' } });
      case 'boolean':
        if (query === 'true' || query === 'false') {
          return acc.concat({ [curr]: query === 'true' });
        }

        return acc;
      default:
        return acc;
    }
  }, []);
};

function validateRepeatableInput(value, { key, min, max }) {
  if (!Array.isArray(value)) {
    const err = new Error(`Group ${key} is repetable. Expected an array`);
    err.status = 400;
    throw err;
  }

  value.forEach(val => {
    if (typeof val !== 'object' || Array.isArray(val) || val === null) {
      const err = new Error(
        `Group ${key} as invalid items. Expected each items to be objects`
      );
      err.status = 400;
      throw err;
    }
  });

  if (min && value.length < min) {
    const err = new Error(`Group ${key} must contain at least ${min} items`);
    err.status = 400;
    throw err;
  }
  if (max && value.length > max) {
    const err = new Error(`Group ${key} must contain at most ${max} items`);
    err.status = 400;
    throw err;
  }
}

function validateNonRepeatableInput(value, { key, required }) {
  if (typeof value !== 'object' || Array.isArray(value)) {
    const err = new Error(`Group ${key} should be an object`);
    err.status = 400;
    throw err;
  }

  if (required === true && value === null) {
    const err = new Error(`Group ${key} is required`);
    err.status = 400;
    throw err;
  }
}
