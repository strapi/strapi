'use strict';

const _ = require('lodash/fp');
const types = require('./types');
const { createField } = require('./fields');
const { createQueryBuilder } = require('./query');
const { createRepository } = require('./entity-repository');
const { isBidirectional } = require('./metadata/relations');

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

        continue;
      }

      if (attribute.morphColumn && attribute.owner) {
        const { idColumn, typeColumn, typeField = '__type' } = attribute.morphColumn;

        const value = data[attributeName];

        if (value === null) {
          Object.assign(obj, {
            [idColumn.name]: null,
            [typeColumn.name]: null,
          });

          continue;
        }

        if (!_.isUndefined(value)) {
          if (!_.has('id', value) || !_.has(typeField, value)) {
            throw new Error(`Expects properties ${typeField} an id to make a morph association`);
          }

          Object.assign(obj, {
            [idColumn.name]: value.id,
            [typeColumn.name]: value[typeField],
          });
        }
      }
    }
  }

  return obj;
};

const createEntityManager = db => {
  const repoMap = {};

  return {
    findOne(uid, params) {
      const qb = this.createQueryBuilder(uid)
        .init(params)
        .first();

      return qb.execute();
    },

    // should we name it findOne because people are used to it ?
    findMany(uid, params) {
      const qb = this.createQueryBuilder(uid).init(params);

      return qb.execute();
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

      const [id] = await this.createQueryBuilder(uid)
        .insert(dataToInsert)
        .execute();

      // create relation associations or move this to the entity service & call attach on the repo instead
      await this.attachRelations(uid, id, data);

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

      await this.updateRelations(uid, id, data);

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

      if (_.isEmpty(where)) {
        throw new Error('Delete requires a where parameter');
      }

      const entity = await this.findOne(uid, {
        select: select && ['id'].concat(select),
        where,
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

      await this.deleteRelations(uid, id);

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

    /**
     * Attach relations to a new entity
     *
     * @param {EntityManager} em - entity manager instance
     * @param {Metadata} metadata - model metadta
     * @param {ID} id - entity ID
     * @param {object} data - data received for creation
     */
    // TODO: wrap Transaction
    async attachRelations(uid, id, data) {
      const { attributes } = db.metadata.get(uid);

      for (const attributeName in attributes) {
        const attribute = attributes[attributeName];

        const isValidLink = _.has(attributeName, data) && !_.isNull(data[attributeName]);

        if (attribute.type !== 'relation' || !isValidLink) {
          continue;
        }

        if (attribute.relation === 'morphOne' || attribute.relation === 'morphMany') {
          const { target, morphBy } = attribute;

          const targetAttribute = db.metadata.get(target).attributes[morphBy];

          if (targetAttribute.relation === 'morphToOne') {
            // set columns
            const { idColumn, typeColumn } = targetAttribute.morphColumn;

            await this.createQueryBuilder(target)
              .update({ [idColumn.name]: id, [typeColumn.name]: uid })
              .where({ id: data[attributeName] })
              .execute();
          } else if (targetAttribute.relation === 'morphToMany') {
            const { joinTable } = targetAttribute;
            const { joinColumn, morphColumn } = joinTable;

            const { idColumn, typeColumn } = morphColumn;

            const rows = _.castArray(data[attributeName]).map((dataID, idx) => ({
              [joinColumn.name]: dataID,
              [idColumn.name]: id,
              [typeColumn.name]: uid,
              ...(joinTable.on || {}),
              order: idx,
            }));

            if (_.isEmpty(rows)) {
              continue;
            }

            await this.createQueryBuilder(joinTable.name)
              .insert(rows)
              .execute();
          }

          continue;
        } else if (attribute.relation === 'morphToOne') {
          // handled on the entry itself
          continue;
        } else if (attribute.relation === 'morphToMany') {
          const { joinTable } = attribute;
          const { joinColumn, morphColumn } = joinTable;

          const { idColumn, typeColumn, typeField = '__type' } = morphColumn;

          const rows = _.castArray(data[attributeName]).map((data, idx) => ({
            [joinColumn.name]: id,
            [idColumn.name]: data.id,
            [typeColumn.name]: data[typeField],
            ...(joinTable.on || {}),
            order: idx,
          }));

          if (_.isEmpty(rows)) {
            continue;
          }

          await this.createQueryBuilder(joinTable.name)
            .insert(rows)
            .execute();

          continue;
        }

        if (attribute.joinColumn && attribute.owner) {
          if (
            attribute.relation === 'oneToOne' &&
            isBidirectional(attribute) &&
            data[attributeName]
          ) {
            await this.createQueryBuilder(uid)
              .where({ [attribute.joinColumn.name]: data[attributeName], id: { $ne: id } })
              .update({ [attribute.joinColumn.name]: null })
              .execute();
          }

          continue;
        }

        // oneToOne oneToMany on the non owning side
        if (attribute.joinColumn && !attribute.owner) {
          // need to set the column on the target
          const { target } = attribute;

          // TODO: check it is an id & the entity exists (will throw due to FKs otherwise so not a big pbl in SQL)

          await this.createQueryBuilder(target)
            .where({ [attribute.joinColumn.referencedColumn]: id })
            .update({ [attribute.joinColumn.referencedColumn]: null })
            .execute();

          await this.createQueryBuilder(target)
            .update({ [attribute.joinColumn.referencedColumn]: id })
            // NOTE: works if it is an array or a single id
            .where({ id: data[attributeName] })
            .execute();
        }

        if (attribute.joinTable) {
          // need to set the column on the target

          const { joinTable } = attribute;
          const { joinColumn, inverseJoinColumn } = joinTable;

          // TODO: redefine
          // TODO: check it is an id & the entity exists (will throw due to FKs otherwise so not a big pbl in SQL)

          if (
            ['oneToOne', 'oneToMany'].includes(attribute.relation) &&
            isBidirectional(attribute)
          ) {
            await this.createQueryBuilder(joinTable.name)
              .delete()
              .where({ [inverseJoinColumn.name]: _.castArray(data[attributeName]) })
              .where(joinTable.on || {})
              .execute();
          }

          const insert = _.castArray(data[attributeName]).map(datum => {
            return {
              [joinColumn.name]: id,
              [inverseJoinColumn.name]: datum,
              ...(joinTable.on || {}),
            };
          });

          // if there is nothing to insert
          if (insert.length === 0) {
            continue;
          }

          await this.createQueryBuilder(joinTable.name)
            .insert(insert)
            .execute();
        }
      }
    },

    /**
     * Updates relations of an existing entity
     *
     * @param {EntityManager} em - entity manager instance
     * @param {Metadata} metadata - model metadta
     * @param {ID} id - entity ID
     * @param {object} data - data received for creation
     */
    // TODO: check relation exists (handled by FKs except for polymorphics)
    // TODO: wrap Transaction
    async updateRelations(uid, id, data) {
      const { attributes } = db.metadata.get(uid);

      for (const attributeName in attributes) {
        const attribute = attributes[attributeName];

        if (attribute.type !== 'relation' || !_.has(attributeName, data)) {
          continue;
        }

        if (attribute.relation === 'morphOne' || attribute.relation === 'morphMany') {
          const { target, morphBy } = attribute;

          const targetAttribute = db.metadata.get(target).attributes[morphBy];

          if (targetAttribute.relation === 'morphToOne') {
            // set columns
            const { idColumn, typeColumn } = targetAttribute.morphColumn;

            await this.createQueryBuilder(target)
              .update({ [idColumn.name]: null, [typeColumn.name]: null })
              .where({ [idColumn.name]: id, [typeColumn.name]: uid })
              .execute();

            if (!_.isNull(data[attributeName])) {
              await this.createQueryBuilder(target)
                .update({ [idColumn.name]: id, [typeColumn.name]: uid })
                .where({ id: data[attributeName] })
                .execute();
            }
          } else if (targetAttribute.relation === 'morphToMany') {
            const { joinTable } = targetAttribute;
            const { joinColumn, morphColumn } = joinTable;

            const { idColumn, typeColumn } = morphColumn;

            await this.createQueryBuilder(joinTable.name)
              .delete()
              .where({
                [idColumn.name]: id,
                [typeColumn.name]: uid,
                ...(joinTable.on || {}),
              })
              .execute();

            const rows = _.castArray(data[attributeName] || []).map((dataID, idx) => ({
              [joinColumn.name]: dataID,
              [idColumn.name]: id,
              [typeColumn.name]: uid,
              ...(joinTable.on || {}),
              order: idx,
            }));

            if (_.isEmpty(rows)) {
              continue;
            }

            await this.createQueryBuilder(joinTable.name)
              .insert(rows)
              .execute();
          }

          continue;
        }

        if (attribute.relation === 'morphToOne') {
          // handled on the entry itself
          continue;
        }

        if (attribute.relation === 'morphToMany') {
          const { joinTable } = attribute;
          const { joinColumn, morphColumn } = joinTable;

          const { idColumn, typeColumn, typeField = '__type' } = morphColumn;

          await this.createQueryBuilder(joinTable.name)
            .delete()
            .where({
              [joinColumn.name]: id,
              ...(joinTable.on || {}),
            })
            .execute();

          const rows = _.castArray(data[attributeName] || []).map((data, idx) => ({
            [joinColumn.name]: id,
            [idColumn.name]: data.id,
            [typeColumn.name]: data[typeField],
            ...(joinTable.on || {}),
            order: idx,
          }));

          if (_.isEmpty(rows)) {
            continue;
          }

          await this.createQueryBuilder(joinTable.name)
            .insert(rows)
            .execute();

          continue;
        }

        if (attribute.joinColumn && attribute.owner) {
          // handled in the row itslef
          continue;
        }

        // oneToOne oneToMany on the non owning side.
        // Since it is a join column no need to remove previous relations
        if (attribute.joinColumn && !attribute.owner) {
          // need to set the column on the target
          const { target } = attribute;

          await this.createQueryBuilder(target)
            .where({ [attribute.joinColumn.referencedColumn]: id })
            .update({ [attribute.joinColumn.referencedColumn]: null })
            .execute();

          if (!_.isNull(data[attributeName])) {
            await this.createQueryBuilder(target)
              // NOTE: works if it is an array or a single id
              .where({ id: data[attributeName] })
              .update({ [attribute.joinColumn.referencedColumn]: id })
              .execute();
          }
        }

        if (attribute.joinTable) {
          const { joinTable } = attribute;
          const { joinColumn, inverseJoinColumn } = joinTable;

          // clear previous associations in the joinTable
          await this.createQueryBuilder(joinTable.name)
            .delete()
            .where({ [joinColumn.name]: id })
            .where(joinTable.on || {})
            .execute();

          if (['oneToOne', 'oneToMany'].includes(attribute.relation)) {
            await this.createQueryBuilder(joinTable.name)
              .delete()
              .where({ [inverseJoinColumn.name]: _.castArray(data[attributeName] || []) })
              .where(joinTable.on || {})
              .execute();
          }

          if (!_.isNull(data[attributeName])) {
            const insert = _.castArray(data[attributeName] || []).map(datum => {
              return {
                [joinColumn.name]: id,
                [inverseJoinColumn.name]: datum,
                ...(joinTable.on || {}),
              };
            });

            // if there is nothing to insert
            if (insert.length === 0) {
              continue;
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
     *
     * @param {EntityManager} em - entity manager instance
     * @param {Metadata} metadata - model metadta
     * @param {ID} id - entity ID
     */
    // TODO: wrap Transaction
    async deleteRelations(uid, id) {
      const { attributes } = db.metadata.get(uid);

      for (const attributeName in attributes) {
        const attribute = attributes[attributeName];

        if (attribute.type !== 'relation') {
          continue;
        }

        /*
          if morphOne | morphMany
            if morphBy is morphToOne
              set null
            if morphBy is morphToOne
              delete links
        */
        if (attribute.relation === 'morphOne' || attribute.relation === 'morphMany') {
          const { target, morphBy } = attribute;

          const targetAttribute = db.metadata.get(target).attributes[morphBy];

          if (targetAttribute.relation === 'morphToOne') {
            // set columns
            const { idColumn, typeColumn } = targetAttribute.morphColumn;

            await this.createQueryBuilder(target)
              .update({ [idColumn.name]: null, [typeColumn.name]: null })
              .where({ [idColumn.name]: id, [typeColumn.name]: uid })
              .execute();
          } else if (targetAttribute.relation === 'morphToMany') {
            const { joinTable } = targetAttribute;
            const { morphColumn } = joinTable;

            const { idColumn, typeColumn } = morphColumn;

            await this.createQueryBuilder(joinTable.name)
              .delete()
              .where({
                [idColumn.name]: id,
                [typeColumn.name]: uid,
                ...(joinTable.on || {}),
              })
              .execute();
          }

          continue;
        }

        /*
          if morphToOne
            nothing to do
        */
        if (attribute.relation === 'morphToOne') {
          // do nothing
        }

        /*
            if morphToMany
            delete links
        */
        if (attribute.relation === 'morphToMany') {
          const { joinTable } = attribute;
          const { joinColumn } = joinTable;

          await this.createQueryBuilder(joinTable.name)
            .delete()
            .where({
              [joinColumn.name]: id,
              ...(joinTable.on || {}),
            })
            .execute();

          continue;
        }

        if (db.dialect.usesForeignKeys()) {
          return;
        }

        // NOTE: we do not remove existing associations with the target as it should handled by unique FKs instead
        if (attribute.joinColumn && attribute.owner) {
          // nothing to do => relation already added on the table
          continue;
        }

        // oneToOne oneToMany on the non owning side.
        if (attribute.joinColumn && !attribute.owner) {
          // need to set the column on the target
          const { target } = attribute;

          await this.createQueryBuilder(target)
            .where({ [attribute.joinColumn.referencedColumn]: id })
            .update({ [attribute.joinColumn.referencedColumn]: null })
            .execute();
        }

        if (attribute.joinTable) {
          const { joinTable } = attribute;
          const { joinColumn } = joinTable;

          await this.createQueryBuilder(joinTable.name)
            .delete()
            .where({ [joinColumn.name]: id })
            .where(joinTable.on || {})
            .execute();
        }
      }
    },

    // TODO: support multiple relations at once with the populate syntax
    async populate(uid, entity, populate) {
      const entry = await this.findOne(uid, {
        select: ['id'],
        where: { id: entity.id },
        populate: populate,
      });

      return Object.assign({}, entity, entry);
    },

    // TODO: support multiple relations at once with the populate syntax
    async load(uid, entity, field, params) {
      const { attributes } = db.metadata.get(uid);

      const attribute = attributes[field];

      if (!attribute || attribute.type !== 'relation') {
        throw new Error('Invalid load. Expected a relational attribute');
      }

      const entry = await this.findOne(uid, {
        select: ['id'],
        where: { id: entity.id },
        populate: {
          [field]: params || true,
        },
      });

      return entry[field];
    },

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
