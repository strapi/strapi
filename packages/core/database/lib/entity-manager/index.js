'use strict';

const {
  castArray,
  compact,
  difference,
  differenceWith,
  flow,
  has,
  isArray,
  isEmpty,
  isEqual,
  isInteger,
  isNil,
  isNull,
  isNumber,
  isPlainObject,
  isString,
  isUndefined,
  map,
  mergeWith,
  omit,
  pick,
  uniqBy,
  uniqWith,
} = require('lodash/fp');

const { mapAsync } = require('@strapi/utils');
const types = require('../types');
const { createField } = require('../fields');
const { createQueryBuilder } = require('../query');
const { createRepository } = require('./entity-repository');
const { deleteRelatedMorphOneRelationsAfterMorphToManyUpdate } = require('./morph-relations');
const {
  isPolymorphic,
  isBidirectional,
  isAnyToOne,
  isOneToAny,
  hasOrderColumn,
  hasInverseOrderColumn,
} = require('../metadata/relations');
const {
  deletePreviousOneToAnyRelations,
  deletePreviousAnyToOneRelations,
  deleteRelations,
  cleanOrderColumns,
} = require('./regular-relations');
const { relationsOrderer } = require('./relations-orderer');
const {
  replaceRegularRelations,
  cloneRegularRelations,
} = require('./relations/cloning/regular-relations');
const { DatabaseError } = require('../errors');

const toId = (value) => value.id || value;
const toIds = (value) => castArray(value || []).map(toId);

const isValidId = (value) => isString(value) || isInteger(value);
const toIdArray = (data) => {
  const array = castArray(data)
    .filter((datum) => !isNil(datum))
    .map((datum) => {
      // if it is a string or an integer return an obj with id = to datum
      if (isValidId(datum)) {
        return { id: datum, __pivot: {} };
      }

      // if it is an object check it has at least a valid id
      if (!has('id', datum) || !isValidId(datum.id)) {
        throw new Error(`Invalid id, expected a string or integer, got ${datum}`);
      }

      return datum;
    });
  return uniqWith(isEqual, array);
};

const toAssocs = (data) => {
  if (isArray(data) || isString(data) || isNumber(data) || isNull(data) || data?.id) {
    return {
      set: isNull(data) ? data : toIdArray(data),
    };
  }

  if (data?.set) {
    return {
      set: isNull(data.set) ? data.set : toIdArray(data.set),
    };
  }

  return {
    options: {
      strict: data?.options?.strict,
    },
    connect: toIdArray(data?.connect).map((elm) => ({
      id: elm.id,
      position: elm.position ? elm.position : { end: true },
    })),
    disconnect: toIdArray(data?.disconnect),
  };
};

const processData = (metadata, data = {}, { withDefaults = false } = {}) => {
  const { attributes } = metadata;

  const obj = {};

  for (const attributeName of Object.keys(attributes)) {
    const attribute = attributes[attributeName];

    if (types.isScalar(attribute.type)) {
      const field = createField(attribute);

      if (isUndefined(data[attributeName])) {
        if (!isUndefined(attribute.default) && withDefaults) {
          if (typeof attribute.default === 'function') {
            obj[attributeName] = attribute.default();
          } else {
            obj[attributeName] = attribute.default;
          }
        }
        continue;
      }

      if (typeof field.validate === 'function' && data[attributeName] !== null) {
        field.validate(data[attributeName]);
      }

      const val = data[attributeName] === null ? null : field.toDB(data[attributeName]);

      obj[attributeName] = val;
    }

    if (types.isRelation(attribute.type)) {
      // oneToOne & manyToOne
      if (attribute.joinColumn && attribute.owner) {
        const joinColumnName = attribute.joinColumn.name;

        // allow setting to null
        const attrValue = !isUndefined(data[attributeName])
          ? data[attributeName]
          : data[joinColumnName];

        if (!isUndefined(attrValue)) {
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

        if (!isUndefined(value)) {
          if (!has('id', value) || !has(typeField, value)) {
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

const createEntityManager = (db) => {
  const repoMap = {};

  return {
    async findOne(uid, params) {
      const states = await db.lifecycles.run('beforeFindOne', uid, { params });

      const result = await this.createQueryBuilder(uid).init(params).first().execute();

      await db.lifecycles.run('afterFindOne', uid, { params, result }, states);

      return result;
    },

    // should we name it findOne because people are used to it ?
    async findMany(uid, params) {
      const states = await db.lifecycles.run('beforeFindMany', uid, { params });

      const result = await this.createQueryBuilder(uid).init(params).execute();

      await db.lifecycles.run('afterFindMany', uid, { params, result }, states);

      return result;
    },

    async count(uid, params) {
      const states = await db.lifecycles.run('beforeCount', uid, { params });

      const res = await this.createQueryBuilder(uid)
        .init(pick(['_q', 'where', 'filters'], params))
        .count()
        .first()
        .execute();

      const result = Number(res.count);

      await db.lifecycles.run('afterCount', uid, { params, result }, states);

      return result;
    },

    async create(uid, params = {}) {
      const states = await db.lifecycles.run('beforeCreate', uid, { params });

      const metadata = db.metadata.get(uid);
      const { data } = params;

      if (!isPlainObject(data)) {
        throw new Error('Create expects a data object');
      }

      const dataToInsert = processData(metadata, data, { withDefaults: true });

      const res = await this.createQueryBuilder(uid).insert(dataToInsert).execute();

      const id = res[0].id || res[0];

      const trx = await strapi.db.transaction();
      try {
        await this.attachRelations(uid, id, data, { transaction: trx.get() });

        await trx.commit();
      } catch (e) {
        await trx.rollback();
        await this.createQueryBuilder(uid).where({ id }).delete().execute();
        throw e;
      }

      // TODO: in case there is no select or populate specified return the inserted data ?
      // TODO: do not trigger the findOne lifecycles ?
      const result = await this.findOne(uid, {
        where: { id },
        select: params.select,
        populate: params.populate,
      });

      await db.lifecycles.run('afterCreate', uid, { params, result }, states);

      return result;
    },

    // TODO: where do we handle relation processing for many queries ?
    async createMany(uid, params = {}) {
      const states = await db.lifecycles.run('beforeCreateMany', uid, { params });

      const metadata = db.metadata.get(uid);
      const { data } = params;

      if (!isArray(data)) {
        throw new Error('CreateMany expects data to be an array');
      }

      const dataToInsert = data.map((datum) =>
        processData(metadata, datum, { withDefaults: true })
      );

      if (isEmpty(dataToInsert)) {
        throw new Error('Nothing to insert');
      }

      const createdEntries = await this.createQueryBuilder(uid).insert(dataToInsert).execute();

      const result = {
        count: data.length,
        ids: createdEntries.map((entry) => (typeof entry === 'object' ? entry?.id : entry)),
      };

      await db.lifecycles.run('afterCreateMany', uid, { params, result }, states);

      return result;
    },

    async update(uid, params = {}) {
      const states = await db.lifecycles.run('beforeUpdate', uid, { params });

      const metadata = db.metadata.get(uid);
      const { where, data } = params;

      if (!isPlainObject(data)) {
        throw new Error('Update requires a data object');
      }

      if (isEmpty(where)) {
        throw new Error('Update requires a where parameter');
      }

      const entity = await this.createQueryBuilder(uid)
        .select('*')
        .where(where)
        .first()
        .execute({ mapResults: false });

      if (!entity) {
        return null;
      }

      const { id } = entity;

      const dataToUpdate = processData(metadata, data);

      if (!isEmpty(dataToUpdate)) {
        await this.createQueryBuilder(uid).where({ id }).update(dataToUpdate).execute();
      }

      const trx = await strapi.db.transaction();
      try {
        await this.updateRelations(uid, id, data, { transaction: trx.get() });
        await trx.commit();
      } catch (e) {
        await trx.rollback();
        await this.createQueryBuilder(uid).where({ id }).update(entity).execute();
        throw e;
      }

      // TODO: do not trigger the findOne lifecycles ?
      const result = await this.findOne(uid, {
        where: { id },
        select: params.select,
        populate: params.populate,
      });

      await db.lifecycles.run('afterUpdate', uid, { params, result }, states);

      return result;
    },

    // TODO: where do we handle relation processing for many queries ?
    async updateMany(uid, params = {}) {
      const states = await db.lifecycles.run('beforeUpdateMany', uid, { params });

      const metadata = db.metadata.get(uid);
      const { where, data } = params;

      const dataToUpdate = processData(metadata, data);

      if (isEmpty(dataToUpdate)) {
        throw new Error('Update requires data');
      }

      const updatedRows = await this.createQueryBuilder(uid)
        .where(where)
        .update(dataToUpdate)
        .execute();

      const result = { count: updatedRows };

      await db.lifecycles.run('afterUpdateMany', uid, { params, result }, states);

      return result;
    },

    async clone(uid, cloneId, params = {}) {
      const states = await db.lifecycles.run('beforeCreate', uid, { params });

      const metadata = db.metadata.get(uid);
      const { data } = params;

      if (!isNil(data) && !isPlainObject(data)) {
        throw new Error('Create expects a data object');
      }

      // TODO: Handle join columns?
      const entity = await this.findOne(uid, { where: { id: cloneId } });

      const dataToInsert = flow(
        // Omit unwanted properties
        omit(['id', 'created_at', 'updated_at']),
        // Merge with provided data, set attribute to null if data attribute is null
        mergeWith(data || {}, (original, override) => (override === null ? override : original)),
        // Process data with metadata
        (entity) => processData(metadata, entity, { withDefaults: true })
      )(entity);

      const res = await this.createQueryBuilder(uid).insert(dataToInsert).execute();

      const id = res[0].id || res[0];

      const trx = await strapi.db.transaction();
      try {
        const cloneAttrs = Object.entries(metadata.attributes).reduce((acc, [attrName, attr]) => {
          // TODO: handle components in the db layer
          if (attr.type === 'relation' && attr.joinTable && !attr.component) {
            acc.push(attrName);
          }
          return acc;
        }, []);

        await this.cloneRelations(uid, id, cloneId, data, { cloneAttrs, transaction: trx.get() });
        await trx.commit();
      } catch (e) {
        await trx.rollback();
        await this.createQueryBuilder(uid).where({ id }).delete().execute();
        throw e;
      }

      const result = await this.findOne(uid, {
        where: { id },
        select: params.select,
        populate: params.populate,
      });

      await db.lifecycles.run('afterCreate', uid, { params, result }, states);

      return result;
    },

    async delete(uid, params = {}) {
      const states = await db.lifecycles.run('beforeDelete', uid, { params });

      const { where, select, populate } = params;

      if (isEmpty(where)) {
        throw new Error('Delete requires a where parameter');
      }

      // TODO: do not trigger the findOne lifecycles ?
      const entity = await this.findOne(uid, {
        select: select && ['id'].concat(select),
        where,
        populate,
      });

      if (!entity) {
        return null;
      }

      const { id } = entity;

      await this.createQueryBuilder(uid).where({ id }).delete().execute();

      const trx = await strapi.db.transaction();
      try {
        await this.deleteRelations(uid, id, { transaction: trx.get() });

        await trx.commit();
      } catch (e) {
        await trx.rollback();
        throw e;
      }

      await db.lifecycles.run('afterDelete', uid, { params, result: entity }, states);

      return entity;
    },

    // TODO: where do we handle relation processing for many queries ?
    async deleteMany(uid, params = {}) {
      const states = await db.lifecycles.run('beforeDeleteMany', uid, { params });

      const { where } = params;

      const deletedRows = await this.createQueryBuilder(uid).where(where).delete().execute();

      const result = { count: deletedRows };

      await db.lifecycles.run('afterDeleteMany', uid, { params, result }, states);

      return result;
    },

    /**
     * Attach relations to a new entity
     *
     * @param {EntityManager} em - entity manager instance
     * @param {Metadata} metadata - model metadta
     * @param {ID} id - entity ID
     * @param {object} data - data received for creation
     */
    async attachRelations(uid, id, data, { transaction: trx }) {
      const { attributes } = db.metadata.get(uid);

      for (const attributeName of Object.keys(attributes)) {
        const attribute = attributes[attributeName];

        const isValidLink = has(attributeName, data) && !isNil(data[attributeName]);

        if (attribute.type !== 'relation' || !isValidLink) {
          continue;
        }

        const cleanRelationData = toAssocs(data[attributeName]);

        if (attribute.relation === 'morphOne' || attribute.relation === 'morphMany') {
          const { target, morphBy } = attribute;

          const targetAttribute = db.metadata.get(target).attributes[morphBy];

          if (targetAttribute.relation === 'morphToOne') {
            // set columns
            const { idColumn, typeColumn } = targetAttribute.morphColumn;

            const relId = toId(cleanRelationData.set[0]);

            await this.createQueryBuilder(target)
              .update({ [idColumn.name]: id, [typeColumn.name]: uid })
              .where({ id: relId })
              .transacting(trx)
              .execute();
          } else if (targetAttribute.relation === 'morphToMany') {
            const { joinTable } = targetAttribute;
            const { joinColumn, morphColumn } = joinTable;

            const { idColumn, typeColumn } = morphColumn;

            if (isEmpty(cleanRelationData.set)) {
              continue;
            }

            const rows = cleanRelationData.set.map((data, idx) => {
              return {
                [joinColumn.name]: data.id,
                [idColumn.name]: id,
                [typeColumn.name]: uid,
                ...(joinTable.on || {}),
                ...(data.__pivot || {}),
                order: idx + 1,
                field: attributeName,
              };
            });

            await this.createQueryBuilder(joinTable.name).insert(rows).transacting(trx).execute();
          }

          continue;
        } else if (attribute.relation === 'morphToOne') {
          // handled on the entry itself
          continue;
        } else if (attribute.relation === 'morphToMany') {
          const { joinTable } = attribute;
          const { joinColumn, morphColumn } = joinTable;

          const { idColumn, typeColumn, typeField = '__type' } = morphColumn;

          if (isEmpty(cleanRelationData.set)) {
            continue;
          }

          const rows = cleanRelationData.set.map((data, idx) => ({
            [joinColumn.name]: id,
            [idColumn.name]: data.id,
            [typeColumn.name]: data[typeField],
            ...(joinTable.on || {}),
            ...(data.__pivot || {}),
            order: idx + 1,
          }));

          // delete previous relations
          await deleteRelatedMorphOneRelationsAfterMorphToManyUpdate(rows, {
            uid,
            attributeName,
            joinTable,
            db,
            transaction: trx,
          });

          await this.createQueryBuilder(joinTable.name).insert(rows).transacting(trx).execute();

          continue;
        }

        if (attribute.joinColumn && attribute.owner) {
          const relIdsToAdd = toIds(cleanRelationData.set);
          if (
            attribute.relation === 'oneToOne' &&
            isBidirectional(attribute) &&
            relIdsToAdd.length
          ) {
            await this.createQueryBuilder(uid)
              .where({ [attribute.joinColumn.name]: relIdsToAdd, id: { $ne: id } })
              .update({ [attribute.joinColumn.name]: null })
              .transacting(trx)
              .execute();
          }

          continue;
        }

        // oneToOne oneToMany on the non owning side
        if (attribute.joinColumn && !attribute.owner) {
          // need to set the column on the target
          const { target } = attribute;

          // TODO: check it is an id & the entity exists (will throw due to FKs otherwise so not a big pbl in SQL)
          const relIdsToAdd = toIds(cleanRelationData.set);

          await this.createQueryBuilder(target)
            .where({ [attribute.joinColumn.referencedColumn]: id })
            .update({ [attribute.joinColumn.referencedColumn]: null })
            .transacting(trx)
            .execute();

          await this.createQueryBuilder(target)
            .update({ [attribute.joinColumn.referencedColumn]: id })
            // NOTE: works if it is an array or a single id
            .where({ id: relIdsToAdd })
            .transacting(trx)
            .execute();
        }

        if (attribute.joinTable) {
          // need to set the column on the target

          const { joinTable } = attribute;
          const { joinColumn, inverseJoinColumn, orderColumnName, inverseOrderColumnName } =
            joinTable;

          const relsToAdd = cleanRelationData.set || cleanRelationData.connect;
          const relIdsToadd = toIds(relsToAdd);

          if (isBidirectional(attribute) && isOneToAny(attribute)) {
            await deletePreviousOneToAnyRelations({
              id,
              attribute,
              relIdsToadd,
              db,
              transaction: trx,
            });
          }

          // prepare new relations to insert
          const insert = uniqBy('id', relsToAdd).map((data) => {
            return {
              [joinColumn.name]: id,
              [inverseJoinColumn.name]: data.id,
              ...(joinTable.on || {}),
              ...(data.__pivot || {}),
            };
          });

          // add order value
          if (cleanRelationData.set && hasOrderColumn(attribute)) {
            insert.forEach((data, idx) => {
              data[orderColumnName] = idx + 1;
            });
          } else if (cleanRelationData.connect && hasOrderColumn(attribute)) {
            // use position attributes to calculate order
            const orderMap = relationsOrderer(
              [],
              inverseJoinColumn.name,
              joinTable.orderColumnName,
              true // Always make an strict connect when inserting
            )
              .connect(relsToAdd)
              .get()
              // set the order based on the order of the ids
              .reduce((acc, rel, idx) => ({ ...acc, [rel.id]: idx }), {});

            insert.forEach((row) => {
              row[orderColumnName] = orderMap[row[inverseJoinColumn.name]];
            });
          }

          // add inv_order value
          if (hasInverseOrderColumn(attribute)) {
            const maxResults = await db
              .getConnection()
              .select(inverseJoinColumn.name)
              .max(inverseOrderColumnName, { as: 'max' })
              .whereIn(inverseJoinColumn.name, relIdsToadd)
              .where(joinTable.on || {})
              .groupBy(inverseJoinColumn.name)
              .from(joinTable.name)
              .transacting(trx);

            const maxMap = maxResults.reduce(
              (acc, res) => Object.assign(acc, { [res[inverseJoinColumn.name]]: res.max }),
              {}
            );

            insert.forEach((rel) => {
              rel[inverseOrderColumnName] = (maxMap[rel[inverseJoinColumn.name]] || 0) + 1;
            });
          }

          if (insert.length === 0) {
            continue;
          }

          // insert new relations
          await this.createQueryBuilder(joinTable.name).insert(insert).transacting(trx).execute();
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
    async updateRelations(uid, id, data, { transaction: trx }) {
      const { attributes } = db.metadata.get(uid);

      for (const attributeName of Object.keys(attributes)) {
        const attribute = attributes[attributeName];

        if (attribute.type !== 'relation' || !has(attributeName, data)) {
          continue;
        }
        const cleanRelationData = toAssocs(data[attributeName]);

        if (attribute.relation === 'morphOne' || attribute.relation === 'morphMany') {
          const { target, morphBy } = attribute;

          const targetAttribute = db.metadata.get(target).attributes[morphBy];

          if (targetAttribute.relation === 'morphToOne') {
            // set columns
            const { idColumn, typeColumn } = targetAttribute.morphColumn;

            // update instead of deleting because the relation is directly on the entity table
            // and not in a join table
            await this.createQueryBuilder(target)
              .update({ [idColumn.name]: null, [typeColumn.name]: null })
              .where({ [idColumn.name]: id, [typeColumn.name]: uid })
              .transacting(trx)
              .execute();

            if (!isNull(cleanRelationData.set)) {
              const relId = toIds(cleanRelationData.set[0]);
              await this.createQueryBuilder(target)
                .update({ [idColumn.name]: id, [typeColumn.name]: uid })
                .where({ id: relId })
                .transacting(trx)
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
                field: attributeName,
              })
              .transacting(trx)
              .execute();

            if (isEmpty(cleanRelationData.set)) {
              continue;
            }

            const rows = cleanRelationData.set.map((data, idx) => ({
              [joinColumn.name]: data.id,
              [idColumn.name]: id,
              [typeColumn.name]: uid,
              ...(joinTable.on || {}),
              ...(data.__pivot || {}),
              order: idx + 1,
              field: attributeName,
            }));

            await this.createQueryBuilder(joinTable.name).insert(rows).transacting(trx).execute();
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
            .transacting(trx)
            .execute();

          if (isEmpty(cleanRelationData.set)) {
            continue;
          }

          const rows = cleanRelationData.set.map((data, idx) => ({
            [joinColumn.name]: id,
            [idColumn.name]: data.id,
            [typeColumn.name]: data[typeField],
            ...(joinTable.on || {}),
            ...(data.__pivot || {}),
            order: idx + 1,
          }));

          // delete previous relations
          await deleteRelatedMorphOneRelationsAfterMorphToManyUpdate(rows, {
            uid,
            attributeName,
            joinTable,
            db,
            transaction: trx,
          });

          await this.createQueryBuilder(joinTable.name).insert(rows).transacting(trx).execute();

          continue;
        }

        if (attribute.joinColumn && attribute.owner) {
          // handled in the row itself
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
            .transacting(trx)
            .execute();

          if (!isNull(cleanRelationData.set)) {
            const relIdsToAdd = toIds(cleanRelationData.set);
            await this.createQueryBuilder(target)
              .where({ id: relIdsToAdd })
              .update({ [attribute.joinColumn.referencedColumn]: id })
              .transacting(trx)
              .execute();
          }
        }

        if (attribute.joinTable) {
          const { joinTable } = attribute;
          const { joinColumn, inverseJoinColumn, orderColumnName, inverseOrderColumnName } =
            joinTable;
          const select = [joinColumn.name, inverseJoinColumn.name];
          if (hasOrderColumn(attribute)) {
            select.push(orderColumnName);
          }
          if (hasInverseOrderColumn(attribute)) {
            select.push(inverseOrderColumnName);
          }

          // only delete relations
          if (isNull(cleanRelationData.set)) {
            await deleteRelations({ id, attribute, db, relIdsToDelete: 'all', transaction: trx });
          } else {
            const isPartialUpdate = !has('set', cleanRelationData);
            let relIdsToaddOrMove;

            if (isPartialUpdate) {
              if (isAnyToOne(attribute)) {
                cleanRelationData.connect = cleanRelationData.connect.slice(-1);
              }
              relIdsToaddOrMove = toIds(cleanRelationData.connect);
              const relIdsToDelete = toIds(
                differenceWith(isEqual, cleanRelationData.disconnect, cleanRelationData.connect)
              );

              if (!isEmpty(relIdsToDelete)) {
                await deleteRelations({ id, attribute, db, relIdsToDelete, transaction: trx });
              }

              if (isEmpty(cleanRelationData.connect)) {
                continue;
              }

              // Fetch current relations to handle ordering
              let currentMovingRels;
              if (hasOrderColumn(attribute) || hasInverseOrderColumn(attribute)) {
                currentMovingRels = await this.createQueryBuilder(joinTable.name)
                  .select(select)
                  .where({
                    [joinColumn.name]: id,
                    [inverseJoinColumn.name]: { $in: relIdsToaddOrMove },
                  })
                  .where(joinTable.on || {})
                  .transacting(trx)
                  .execute();
              }

              // prepare relations to insert
              const insert = uniqBy('id', cleanRelationData.connect).map((relToAdd) => ({
                [joinColumn.name]: id,
                [inverseJoinColumn.name]: relToAdd.id,
                ...(joinTable.on || {}),
                ...(relToAdd.__pivot || {}),
              }));

              if (hasOrderColumn(attribute)) {
                // Get all adjacent relations and the one with the highest order
                const adjacentRelations = await this.createQueryBuilder(joinTable.name)
                  .where({
                    $or: [
                      {
                        [joinColumn.name]: id,
                        [inverseJoinColumn.name]: {
                          $in: compact(
                            cleanRelationData.connect.map(
                              (r) => r.position?.after || r.position?.before
                            )
                          ),
                        },
                      },
                      {
                        [joinColumn.name]: id,
                        [orderColumnName]: this.createQueryBuilder(joinTable.name)
                          .max(orderColumnName)
                          .where({ [joinColumn.name]: id })
                          .where(joinTable.on || {})
                          .transacting(trx)
                          .getKnexQuery(),
                      },
                    ],
                  })
                  .where(joinTable.on || {})
                  .transacting(trx)
                  .execute();

                const orderMap = relationsOrderer(
                  adjacentRelations,
                  inverseJoinColumn.name,
                  joinTable.orderColumnName,
                  cleanRelationData.options.strict
                )
                  .connect(cleanRelationData.connect)
                  .getOrderMap();

                insert.forEach((row) => {
                  row[orderColumnName] = orderMap[row[inverseJoinColumn.name]];
                });
              }

              // add inv order value
              if (hasInverseOrderColumn(attribute)) {
                const nonExistingRelsIds = difference(
                  relIdsToaddOrMove,
                  map(inverseJoinColumn.name, currentMovingRels)
                );

                const maxResults = await db
                  .getConnection()
                  .select(inverseJoinColumn.name)
                  .max(inverseOrderColumnName, { as: 'max' })
                  .whereIn(inverseJoinColumn.name, nonExistingRelsIds)
                  .where(joinTable.on || {})
                  .groupBy(inverseJoinColumn.name)
                  .from(joinTable.name)
                  .transacting(trx);

                const maxMap = maxResults.reduce(
                  (acc, res) => Object.assign(acc, { [res[inverseJoinColumn.name]]: res.max }),
                  {}
                );

                insert.forEach((row) => {
                  row[inverseOrderColumnName] = (maxMap[row[inverseJoinColumn.name]] || 0) + 1;
                });
              }

              // insert rows
              const query = this.createQueryBuilder(joinTable.name)
                .insert(insert)
                .onConflict(joinTable.pivotColumns)
                .transacting(trx);

              if (hasOrderColumn(attribute)) {
                query.merge([orderColumnName]);
              } else {
                query.ignore();
              }

              await query.execute();

              // remove gap between orders
              await cleanOrderColumns({ attribute, db, id, transaction: trx });
            } else {
              if (isAnyToOne(attribute)) {
                cleanRelationData.set = cleanRelationData.set.slice(-1);
              }
              // overwrite all relations
              relIdsToaddOrMove = toIds(cleanRelationData.set);
              await deleteRelations({
                id,
                attribute,
                db,
                relIdsToDelete: 'all',
                relIdsToNotDelete: relIdsToaddOrMove,
                transaction: trx,
              });

              if (isEmpty(cleanRelationData.set)) {
                continue;
              }

              const insert = uniqBy('id', cleanRelationData.set).map((relToAdd) => ({
                [joinColumn.name]: id,
                [inverseJoinColumn.name]: relToAdd.id,
                ...(joinTable.on || {}),
                ...(relToAdd.__pivot || {}),
              }));

              // add order value
              if (hasOrderColumn(attribute)) {
                insert.forEach((row, idx) => {
                  row[orderColumnName] = idx + 1;
                });
              }

              // add inv order value
              if (hasInverseOrderColumn(attribute)) {
                const existingRels = await this.createQueryBuilder(joinTable.name)
                  .select(inverseJoinColumn.name)
                  .where({
                    [joinColumn.name]: id,
                    [inverseJoinColumn.name]: { $in: relIdsToaddOrMove },
                  })
                  .where(joinTable.on || {})
                  .transacting(trx)
                  .execute();

                const nonExistingRelsIds = difference(
                  relIdsToaddOrMove,
                  map(inverseJoinColumn.name, existingRels)
                );

                const maxResults = await db
                  .getConnection()
                  .select(inverseJoinColumn.name)
                  .max(inverseOrderColumnName, { as: 'max' })
                  .whereIn(inverseJoinColumn.name, nonExistingRelsIds)
                  .where(joinTable.on || {})
                  .groupBy(inverseJoinColumn.name)
                  .from(joinTable.name)
                  .transacting(trx);

                const maxMap = maxResults.reduce(
                  (acc, res) => Object.assign(acc, { [res[inverseJoinColumn.name]]: res.max }),
                  {}
                );

                insert.forEach((row) => {
                  row[inverseOrderColumnName] = (maxMap[row[inverseJoinColumn.name]] || 0) + 1;
                });
              }

              // insert rows
              const query = this.createQueryBuilder(joinTable.name)
                .insert(insert)
                .onConflict(joinTable.pivotColumns)
                .transacting(trx);

              if (hasOrderColumn(attribute)) {
                query.merge([orderColumnName]);
              } else {
                query.ignore();
              }

              await query.execute();
            }

            // Delete the previous relations for oneToAny relations
            if (isBidirectional(attribute) && isOneToAny(attribute)) {
              await deletePreviousOneToAnyRelations({
                id,
                attribute,
                relIdsToadd: relIdsToaddOrMove,
                db,
                transaction: trx,
              });
            }

            // Delete the previous relations for anyToOne relations
            if (isAnyToOne(attribute)) {
              await deletePreviousAnyToOneRelations({
                id,
                attribute,
                relIdToadd: relIdsToaddOrMove[0],
                db,
                transaction: trx,
              });
            }
          }
        }
      }
    },

    /**
     * Delete relational associations of an existing entity
     * This removes associations but doesn't do cascade deletions for components for example. This will be handled on the entity service layer instead
     * NOTE: Most of the deletion should be handled by ON DELETE CASCADE for dialects that have FKs
     *
     * @param {EntityManager} em - entity manager instance
     * @param {Metadata} metadata - model metadta
     * @param {ID} id - entity ID
     */
    async deleteRelations(uid, id, { transaction: trx }) {
      const { attributes } = db.metadata.get(uid);

      for (const attributeName of Object.keys(attributes)) {
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
              .transacting(trx)
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
                field: attributeName,
              })
              .transacting(trx)
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
            .transacting(trx)
            .execute();

          continue;
        }

        // do not need to delete links when using foreign keys
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
            .transacting(trx)
            .execute();
        }

        if (attribute.joinTable) {
          await deleteRelations({ id, attribute, db, relIdsToDelete: 'all', transaction: trx });
        }
      }
    },

    // TODO: Clone polymorphic relations
    /**
     *
     * @param {string} uid - uid of the entity to clone
     * @param {number} targetId - id of the entity to clone into
     * @param {number} sourceId - id of the entity to clone from
     * @param {object} opt
     * @param {object} opt.cloneAttrs - key value pair of attributes to clone
     * @param {object} opt.transaction - transaction to use
     * @example cloneRelations('user', 3, 1, { cloneAttrs: ["comments"]})
     * @example cloneRelations('post', 5, 2, { cloneAttrs: ["comments", "likes"] })
     */
    async cloneRelations(uid, targetId, sourceId, data, { cloneAttrs = [], transaction }) {
      const { attributes } = db.metadata.get(uid);

      if (!attributes) {
        return;
      }

      await mapAsync(cloneAttrs, async (attrName) => {
        const attribute = attributes[attrName];

        if (attribute.type !== 'relation') {
          throw new DatabaseError(
            `Attribute ${attrName} is not a relation attribute. Cloning relations is only supported for relation attributes.`
          );
        }

        if (isPolymorphic(attribute)) {
          // TODO: add support for cloning polymorphic relations
          return;
        }

        if (attribute.joinColumn) {
          // TODO: add support for cloning oneToMany relations on the owning side
          return;
        }

        if (!attribute.joinTable) {
          return;
        }

        let omitIds = [];
        if (has(attrName, data)) {
          const cleanRelationData = toAssocs(data[attrName]);

          // Don't clone if the relation attr is being set
          if (cleanRelationData.set) {
            return;
          }

          // Disconnected relations don't need to be cloned
          if (cleanRelationData.disconnect) {
            omitIds = toIds(cleanRelationData.disconnect);
          }
        }

        if (isOneToAny(attribute) && isBidirectional(attribute)) {
          await replaceRegularRelations({ targetId, sourceId, attribute, omitIds, transaction });
        } else {
          await cloneRegularRelations({ targetId, sourceId, attribute, transaction });
        }
      });

      await this.updateRelations(uid, targetId, data, { transaction });
    },

    // TODO: add lifecycle events
    async populate(uid, entity, populate) {
      const entry = await this.findOne(uid, {
        select: ['id'],
        where: { id: entity.id },
        populate,
      });

      return { ...entity, ...entry };
    },

    // TODO: add lifecycle events
    async load(uid, entity, fields, params) {
      const { attributes } = db.metadata.get(uid);

      const fieldsArr = castArray(fields);
      fieldsArr.forEach((field) => {
        const attribute = attributes[field];

        if (!attribute || attribute.type !== 'relation') {
          throw new Error(`Invalid load. Expected ${field} to be a relational attribute`);
        }
      });

      const entry = await this.findOne(uid, {
        select: ['id'],
        where: { id: entity.id },
        populate: fieldsArr.reduce((acc, field) => {
          acc[field] = params || true;
          return acc;
        }, {}),
      });

      if (!entry) {
        return null;
      }

      if (Array.isArray(fields)) {
        return pick(fields, entry);
      }

      return entry[fields];
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
    // -> map result
    // -> map input

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
