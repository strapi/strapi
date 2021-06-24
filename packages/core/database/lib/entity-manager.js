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

        const attrValue = data[attributeName] || data[joinColumnName];

        if (!_.isUndefined(attrValue)) {
          obj[joinColumnName] = attrValue;
        }
      }
    }
  }

  return obj;
};

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
              };
            })
          : {
              [joinColumn.name]: id,
              [inverseJoinColumn.name]: data[attributeName],
            };

        await em
          .createQueryBuilder(joinTable.name)
          .insert(insert)
          .execute();
      }
    }

    /*
          oneToOne
            if owner
              if joinColumn
                TODO: We might actually want to make the column unique and throw -> doing this makes the code generic and doesn't require specific logic
                removing existing relation
                -> Id should have been added in the column of the model table beforehand to avoid extra updates
              if joinTable
                -> clear join Table assoc
                -> add relation

            if not owner
              if joinColumn
                remove existing relation
                -> add relation
              if joinTable
                -> clear join Table assoc
                -> add relation in join table

          oneToMany
            owner -> cannot be owner
            not owner
              joinColumn
                -> add relations in target
              joinTable
                -> add relations in join table

          manyToOne
            not owner -> must be owner
            owner
              join Column
                -> Id should have been added in the column of the model table beforehand to avoid extra updates
              joinTable
                -> add relation in join table

          manyToMany
            -> add relation in join table

        */
  }
};

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

    // TODO: define api
    async count(uid, params = {}) {
      const qb = this.createQueryBuilder(uid).where(params.where);

      const res = await qb
        .count()
        .first()
        .execute();

      return Number(res.count);
    },

    // TODO: make it create one somehow
    async create(uid, params) {
      // create entry in DB

      const metadata = db.metadata.get(uid);

      const { data } = params;

      // transform value to storage value
      // apply programatic defaults if any -> I think this should be handled outside of this layer as we might have some applicative rules in the entity service

      // TODO: in query builder ?
      const dataToInsert = pickRowAttributes(metadata, data);

      if (_.isEmpty(dataToInsert)) {
        throw new Error('Create requires data');
      }

      const [id] = await this.createQueryBuilder(uid)
        .insert(dataToInsert)
        .execute();

      // create relation associations or move this to the entity service & call attach on the repo instead
      await attachRelations(this, metadata, id, data);

      return this.findOne(uid, { where: { id }, select: params.select, populate: params.populate });
    },

    async createMany(uid, params) {
      const { data } = params;

      const metadata = db.metadata.get(uid);

      // Add defaults / transform to storage type
      const dataToInsert = data.map(datum => pickRowAttributes(metadata, datum));

      if (_.isEmpty(dataToInsert)) {
        throw new Error('Create requires data');
      }

      await this.createQueryBuilder(uid)
        .insert(dataToInsert)
        .execute();

      return { count: data.length };
    },

    // TODO: make it update one somehow
    // findOne + update with a return
    async update(uid, params) {
      const { where, data } = params;

      const metadata = db.metadata.get(uid);
      const dataToUpdate = pickRowAttributes(metadata, data);

      if (_.isEmpty(dataToUpdate)) {
        throw new Error('Update requires data');
      }

      const res = await this.createQueryBuilder(uid)
        .where(where)
        .update(dataToUpdate)
        .execute();

      // TODO: update relations
      console.log({ res });

      // TODO: return obj
      return {};
    },

    // only returns the number of affected rows
    async updateMany(uid, params) {
      const { where, data } = params;

      const metadata = db.metadata.get(uid);
      const dataToUpdate = pickRowAttributes(metadata, data);

      if (_.isEmpty(dataToUpdate)) {
        throw new Error('Update requires data');
      }

      const res = await this.createQueryBuilder(uid)
        .where(where)
        .update(dataToUpdate)
        .execute();

      console.log({ res });

      // TODO: update relations

      // TODO: Return count on updateMany
    },

    // TODO: make it deleteOne somehow
    // findOne + delete with a return -> should go in the entity service
    async delete(uid, params) {
      const res = await this.createQueryBuilder(uid)
        .init(params)
        .delete()
        .execute();

      console.log({ res });
      // TODO: delete relations

      return res;
    },

    async deleteMany(uid, params) {
      const { where } = params;

      const res = await this.createQueryBuilder(uid)
        .where(where)
        .delete()
        .execute();

      // TODO: delete relations

      return res;
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
