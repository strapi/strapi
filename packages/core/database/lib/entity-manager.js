'use strict';

const _ = require('lodash/fp');
const types = require('./types');
const { createField } = require('./fields');
const { createQueryBuilder } = require('./query');
const { createRepository } = require('./entity-repository');

// TODO: move to query layer
const toRow = (metadata, data = {}) => {
  const { attributes } = metadata;

  const obj = {};

  for (const attributeName in attributes) {
    const attribute = attributes[attributeName];

    if (types.isScalar(attribute.type) && _.has(attributeName, data)) {
      // TODO: we convert to column name
      // TODO: handle default value

      const field = createField(attribute.type, attribute);

      // TODO: validate data on creation
      // field.validate(data[attributeName]);

      const val = data[attributeName] === null ? null : field.toDB(data[attributeName]);

      obj[attributeName] = val;
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

      const dataToInsert = toRow(metadata, data);

      // if (_.isEmpty(dataToInsert)) {
      //   throw new Error('Create requires data');
      // }

      const [id] = await this.createQueryBuilder(uid)
        .insert(dataToInsert)
        .execute();

      // create relation associations or move this to the entity service & call attach on the repo instead
      await this.attachRelations(metadata, id, data);

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

      const dataToInsert = data.map(datum => toRow(metadata, datum));

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

      if (!_.isPlainObject(data)) {
        throw new Error('Update requires a data object');
      }

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

      const dataToUpdate = toRow(metadata, data);

      if (!_.isEmpty(dataToUpdate)) {
        await this.createQueryBuilder(uid)
          .where({ id })
          .update(dataToUpdate)
          .execute();
      }

      await this.updateRelations(metadata, id, data);

      return this.findOne(uid, { where: { id }, select: params.select, populate: params.populate });
    },

    // TODO: where do we handle relation processing for many queries ?
    async updateMany(uid, params = {}) {
      const { where, data } = params;

      const metadata = db.metadata.get(uid);
      const dataToUpdate = toRow(metadata, data);

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

      await this.deleteRelations(metadata, id);

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

    /**
     * Attach relations to a new entity
     * TODO: Link to documentation
     * @param {EntityManager} em - entity manager instance
     * @param {Metadata} metadata - model metadta
     * @param {ID} id - entity ID
     * @param {object} data - data received for creation
     */
    async attachRelations(metadata, id, data) {
      const { attributes } = metadata;

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
            await this.createQueryBuilder(target)
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
            const insert = _.castArray(data[attributeName]).map(datum => {
              return {
                [joinColumn.name]: id,
                [inverseJoinColumn.name]: datum,
                ...(joinTable.on || {}),
              };
            });

            // if there is nothing to insert
            if (insert.length === 0) {
              return;
            }

            await this.createQueryBuilder(joinTable.name)
              .insert(insert)
              .execute();
          }
        }
      }
    },

    /**
     * Updates relations of an existing entity
     * TODO: [Link to the documentation]
     * @param {EntityManager} em - entity manager instance
     * @param {Metadata} metadata - model metadta
     * @param {ID} id - entity ID
     * @param {object} data - data received for creation
     */
    // TODO: check relation exists (handled by FKs except for polymorphics)
    async updateRelations(metadata, id, data) {
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
            await this.createQueryBuilder(target)
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
            await this.createQueryBuilder(joinTable.name)
              .delete()
              .where({ [joinColumn.name]: id })
              .where(joinTable.on ? joinTable.on : {})
              .execute();

            const insert = _.castArray(data[attributeName]).map(datum => {
              return {
                [joinColumn.name]: id,
                [inverseJoinColumn.name]: datum,
                ...(joinTable.on || {}),
              };
            });

            // if there is nothing to insert
            if (insert.length === 0) {
              return;
            }

            await this.createQueryBuilder(joinTable.name)
              .insert(insert)
              .execute();
          }
        }
      }
    },

    /**
     * Delete relations of an existing entity
     * This removes associations but doesn't do cascade deletions for components for example. This will be handled on the entity service layer instead
     * NOTE: Most of the deletion should be handled by ON DELETE CASCADE for dialect that have FKs
     * TODO: link to documentation
     * @param {EntityManager} em - entity manager instance
     * @param {Metadata} metadata - model metadta
     * @param {ID} id - entity ID
     */
    async deleteRelations(metadata, id) {
      // TODO: Implement correctly
      if (db.dialect.usesForeignKeys()) {
        return;
      }

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

          await this.createQueryBuilder(target)
            .where({ [attribute.joinColumn.referencedColumn]: id })
            .delete()
            .execute();
        }

        if (attribute.joinTable) {
          const { joinTable } = attribute;
          const { joinColumn } = joinTable;

          await this.createQueryBuilder(joinTable.name)
            .delete()
            .where({ [joinColumn.name]: id })
            .where(joinTable.on ? joinTable.on : {})
            .execute();
        }
      }
    },

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
