'use strict';

const _ = require('lodash/fp');
const types = require('./types');
const { createQueryBuilder } = require('./query');
const { createRepository } = require('./entity-repository');

const pickRowAttributes = (metadata, data = {}) => {
  const { attributes } = metadata;

  const obj = {};

  // pick attribute

  for (const attributeName in attributes) {
    const attribute = attributes[attributeName];

    if (types.isScalar(attribute.type) && _.has(attributeName, data)) {
      // NOTE: we convert to column name
      obj[_.snakeCase(attributeName)] = data[attributeName];
    }

    if (types.isRelation(attribute.type)) {
      // oneToOne & manyToOne
      if (attribute.joinColumn && attribute.owner) {
        // TODO: ensure joinColumn name respect convention ?
        const joinColumnName = attribute.joinColumn.name;

        // allow setting to null
        const attrValue = !_.isUndefined(data[attributeName])
          ? data[attributeName]
          : data[joinColumnName];

        if (!_.isUndefined(attrValue)) {
          obj[joinColumnName] = attrValue;
        }
      }
    }
  }

  return obj;
};

/**
 * Attach relations to a new entity
 * oneToOne
 *   if owner
 *     if joinColumn
 *       -> Id should have been added in the column of the model table beforehand to avoid extra updates
 *     if joinTable
 *       -> add relation
 *
 *   if not owner
 *     if joinColumn
 *       -> add relation
 *     if joinTable
 *       -> add relation in join table
 *
 * oneToMany
 *   owner -> cannot be owner
 *   not owner
 *     joinColumn
 *       -> add relations in target
 *     joinTable
 *       -> add relations in join table
 *
 * manyToOne
 *   not owner -> must be owner
 *   owner
 *     join Column
 *       -> Id should have been added in the column of the model table beforehand to avoid extra updates
 *     joinTable
 *       -> add relation in join table
 *
 * manyToMany
 *   -> add relation in join table
 *
 * @param {EntityManager} em - entity manager instance
 * @param {Metadata} metadata - model metadta
 * @param {ID} id - entity ID
 * @param {object} data - data received for creation
 */
const attachRelations = async (em, metadata, id, data) => {
  const { attributes } = metadata;

  // TODO: optimize later for createMany

  for (const attributeName in attributes) {
    const attribute = attributes[attributeName];

    if (attribute.joinColumn && attribute.owner) {
      // nothing to do => relation already added on the table
      continue;
    }

    // oneToOne oneToMany on the non owning side
    if (attribute.joinColumn && !attribute.owner) {
      // need to set the column on the target
      const { target } = attribute;

      // TODO: check it is an id & the entity exists (will throw due to FKs otherwise so not a big pbl in SQL)
      if (data[attributeName]) {
        await em
          .createQueryBuilder(target)
          .update({ [attribute.joinColumn.referencedColumn]: id })
          // NOTE: works if it is an array or a single id
          .where({ id: data[attributeName] })
          .execute();
      }
    }

    if (attribute.joinTable) {
      // need to set the column on the target

      const { joinTable } = attribute;
      const { joinColumn, inverseJoinColumn } = joinTable;

      // TODO: check it is an id & the entity exists (will throw due to FKs otherwise so not a big pbl in SQL)
      if (data[attributeName]) {
        const insert = Array.isArray(data[attributeName])
          ? data[attributeName].map(datum => {
              return {
                [joinColumn.name]: id,
                [inverseJoinColumn.name]: datum,
                ...(joinTable.on || {}),
              };
            })
          : {
              [joinColumn.name]: id,
              [inverseJoinColumn.name]: data[attributeName],
              ...(joinTable.on || {}),
            };

        await em
          .createQueryBuilder(joinTable.name)
          .insert(insert)
          .execute();
      }
    }
  }
};

/**
 * Updates relations of an existing entity
 * oneToOne
 *   if owner
 *     if joinColumn
 *      -> handled in the DB row
 *     if joinTable
 *       -> clear join Table assoc
 *       -> add relation in join table
 *
 *   if not owner
 *     if joinColumn
 *       -> set join column on the target
 *     if joinTable
 *       -> clear join Table assoc
 *       -> add relation in join table
 *
 * oneToMany
 *   owner -> cannot be owner
 *   not owner
 *     joinColumn
 *       -> set join column on the target
 *     joinTable
 *       -> add relations in join table
 *
 * manyToOne
 *   not owner -> must be owner
 *   owner
 *     join Column
 *      -> handled in the DB row
 *     joinTable
 *       -> add relation in join table
 *
 * manyToMany
 *   -> clear join Table assoc
 *   -> add relation in join table
 *
 * @param {EntityManager} em - entity manager instance
 * @param {Metadata} metadata - model metadta
 * @param {ID} id - entity ID
 * @param {object} data - data received for creation
 */
// TODO: check relation exists (handled by FKs except for polymorphics)
const updateRelations = async (em, metadata, id, data) => {
  const { attributes } = metadata;

  for (const attributeName in attributes) {
    const attribute = attributes[attributeName];

    // NOTE: we do not remove existing associations with the target as it should handled by unique FKs instead
    if (attribute.joinColumn && attribute.owner) {
      // nothing to do => relation already added on the table
      continue;
    }

    // oneToOne oneToMany on the non owning side.
    // Since it is a join column no need to remove previous relations
    if (attribute.joinColumn && !attribute.owner) {
      // need to set the column on the target
      const { target } = attribute;

      if (data[attributeName]) {
        await em
          .createQueryBuilder(target)
          .update({ [attribute.joinColumn.referencedColumn]: id })
          // NOTE: works if it is an array or a single id
          .where({ id: data[attributeName] })
          .execute();
      }
    }

    if (attribute.joinTable) {
      const { joinTable } = attribute;
      const { joinColumn, inverseJoinColumn } = joinTable;

      if (data[attributeName]) {
        // clear previous associations in the joinTable
        await em
          .createQueryBuilder(joinTable.name)
          .delete()
          .where({
            [joinColumn.name]: id,
          })
          // TODO: add join.on filters to only clear the valid info
          .where(joinTable.on ? joinTable.on : {})
          .execute();

        // TODO: add pivot informations too
        const insert = Array.isArray(data[attributeName])
          ? data[attributeName].map(datum => {
              return {
                [joinColumn.name]: id,
                [inverseJoinColumn.name]: datum,
                ...(joinTable.on || {}),
              };
            })
          : {
              [joinColumn.name]: id,
              [inverseJoinColumn.name]: data[attributeName],
              ...(joinTable.on || {}),
            };

        console.log(insert);

        await em
          .createQueryBuilder(joinTable.name)
          .insert(insert)
          .execute();
      }
    }
  }
};

/**
 * Delete relations of an existing entity
 * This removes associations but doesn't do cascade deletions for components for example. This will be handled on the entity service layer instead
 * NOTE: Most of the deletion should be handled by ON DELETE CASCADE
 *
 * oneToOne
 *   if owner
 *     if joinColumn
 *      -> handled in the DB row
 *     if joinTable
 *       -> clear join Table assoc
 *
 *   if not owner
 *     if joinColumn
 *       -> set join column on the target // CASCADING should do the job
 *     if joinTable
 *       -> clear join Table assoc // CASCADING
 *
 * oneToMany
 *   owner -> cannot be owner
 *   not owner
 *     joinColumn
 *       -> set join column on the target
 *     joinTable
 *       -> add relations in join table
 *
 * manyToOne
 *   not owner -> must be owner
 *   owner
 *     join Column
 *      -> handled in the DB row
 *     joinTable
 *       -> add relation in join table
 *
 * manyToMany
 *   -> clear join Table assoc
 *   -> add relation in join table
 *
 * @param {EntityManager} em - entity manager instance
 * @param {Metadata} metadata - model metadta
 * @param {ID} id - entity ID
 */
// noop as cascade FKs does the job
const deleteRelations = () => {};

const createEntityManager = db => {
  const repoMap = {};

  return {
    async findOne(uid, params) {
      const qb = this.createQueryBuilder(uid)
        .init(params)
        .first();

      return await qb.execute();
    },

    // should we name it findOne because people are used to it ?
    async findMany(uid, params) {
      const qb = this.createQueryBuilder(uid).init(params);

      return await qb.execute();
    },

    // support search directly in find & count -> a search param ? a different feature with a search tables rather

    async findWithCount(uid, params) {
      return await Promise.all([this.findMany(uid, params), this.count(uid, params)]);
    },

    async count(uid, params = {}) {
      const qb = this.createQueryBuilder(uid).where(params.where);

      const res = await qb
        .count()
        .first()
        .execute();

      return Number(res.count);
    },

    async create(uid, params = {}) {
      // create entry in DB
      const metadata = db.metadata.get(uid);

      const { data } = params;

      if (!_.isPlainObject(data)) {
        throw new Error('Create expects a data object');
      }

      // transform value to storage value
      // apply programatic defaults if any -> I think this should be handled outside of this layer as we might have some applicative rules in the entity service

      const dataToInsert = pickRowAttributes(metadata, data);

      // if (_.isEmpty(dataToInsert)) {
      //   throw new Error('Create requires data');
      // }

      const [id] = await this.createQueryBuilder(uid)
        .insert(dataToInsert)
        .execute();

      // create relation associations or move this to the entity service & call attach on the repo instead
      await attachRelations(this, metadata, id, data);

      // TODO: in case there is not select or populate specified return the inserted data ?

      return this.findOne(uid, { where: { id }, select: params.select, populate: params.populate });
    },

    // TODO: where do we handle relation processing for many queries ?
    async createMany(uid, params = {}) {
      const { data } = params;

      if (!_.isArray(data)) {
        throw new Error('CreateMany expecets data to be an array');
      }

      const metadata = db.metadata.get(uid);

      const dataToInsert = data.map(datum => pickRowAttributes(metadata, datum));

      if (_.isEmpty(dataToInsert)) {
        throw new Error('Nothing to insert');
      }

      await this.createQueryBuilder(uid)
        .insert(dataToInsert)
        .execute();

      return { count: data.length };
    },

    async update(uid, params = {}) {
      const { where, data } = params;
      const metadata = db.metadata.get(uid);

      if (_.isEmpty(where)) {
        throw new Error('Update requires a where parameter');
      }

      const entity = await this.createQueryBuilder(uid)
        .select('id')
        .where(where)
        .first()
        .execute();

      if (!entity) {
        // TODO: or throw ?
        return null;
      }

      const { id } = entity;

      const dataToUpdate = pickRowAttributes(metadata, data);

      if (!_.isEmpty(dataToUpdate)) {
        await this.createQueryBuilder(uid)
          .where({ id })
          .update(dataToUpdate)
          .execute();
      }

      await updateRelations(this, metadata, id, data);

      return this.findOne(uid, { where: { id }, select: params.select, populate: params.populate });
    },

    // TODO: where do we handle relation processing for many queries ?
    async updateMany(uid, params = {}) {
      const { where, data } = params;

      const metadata = db.metadata.get(uid);
      const dataToUpdate = pickRowAttributes(metadata, data);

      if (_.isEmpty(dataToUpdate)) {
        throw new Error('Update requires data');
      }

      const updatedRows = await this.createQueryBuilder(uid)
        .where(where)
        .update(dataToUpdate)
        .execute();

      return { count: updatedRows };
    },

    async delete(uid, params = {}) {
      const { where, select, populate } = params;
      const metadata = db.metadata.get(uid);

      if (_.isEmpty(where)) {
        throw new Error('Delete requires a where parameter');
      }

      const entity = await this.findOne(uid, {
        where,
        select: select && ['id'].concat(select),
        populate,
      });

      if (!entity) {
        return null;
      }

      const { id } = entity;

      await this.createQueryBuilder(uid)
        .where({ id })
        .delete()
        .execute();

      await deleteRelations(this, metadata, id);

      return entity;
    },

    // TODO: where do we handle relation processing for many queries ?
    async deleteMany(uid, params = {}) {
      const { where } = params;

      const deletedRows = await this.createQueryBuilder(uid)
        .where(where)
        .delete()
        .execute();

      return { count: deletedRows };
    },

    // populate already loaded entry
    async populate(uid, entry, name, params) {
      return {
        ...entry,
        relation: await this.load(entry, name, params),
      };
    },

    // loads a relation
    load(uid, entry, name, params) {
      const { attributes } = db.metadata.get(uid);

      return this.getRepository(attributes[name].target.uid).findMany({
        ...params,
        where: {
          ...params.where,
          // [parent]: entry.id,
        },
      });
    },

    // method to work with components & dynamic zones
    // addComponent() {},
    // removeComponent() {},
    // setComponent() {},

    // method to work with relations
    attachRelation() {},
    detachRelation() {},
    setRelation() {},

    // cascading
    // aggregations
    // -> avg
    // -> min
    // -> max
    // -> grouping

    // formulas
    // custom queries

    // utilities
    // -> format
    // -> parse
    // -> map result
    // -> map input
    // -> validation

    // extra features
    // -> virtuals
    // -> private
    createQueryBuilder(uid) {
      return createQueryBuilder(uid, db);
    },

    getRepository(uid) {
      if (!repoMap[uid]) {
        repoMap[uid] = createRepository(uid, db);
      }

      return repoMap[uid];
    },

    clearRepositories() {
      repoMap.clear();
    },
  };
};

module.exports = {
  createEntityManager,
};
