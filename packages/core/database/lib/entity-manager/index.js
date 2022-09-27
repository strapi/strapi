'use strict';

const {
  isUndefined,
  castArray,
  isNil,
  has,
  isString,
  isInteger,
  pick,
  isPlainObject,
  isEmpty,
  isArray,
  isNull,
  uniqWith,
  isEqual,
  differenceWith,
  isNumber,
  map,
  difference,
} = require('lodash/fp');
const types = require('../types');
const { createField } = require('../fields');
const { createQueryBuilder } = require('../query');
const { createRepository } = require('./entity-repository');
const { deleteRelatedMorphOneRelationsAfterMorphToManyUpdate } = require('./morph-relations');
const {
  isBidirectional,
  isAnyToOne,
  hasOrderColumn,
  hasInverseOrderColumn,
} = require('../metadata/relations');
const {
  deletePreviousOneToAnyRelations,
  deletePreviousAnyToOneRelations,
  deleteRelations,
  cleanOrderColumns,
} = require('./regular-relations');

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
    connect: toIdArray(data?.connect),
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

      await this.attachRelations(uid, id, data);

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

      await this.createQueryBuilder(uid).insert(dataToInsert).execute();

      const result = { count: data.length };

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

      const entity = await this.createQueryBuilder(uid).select('id').where(where).first().execute();

      if (!entity) {
        return null;
      }

      const { id } = entity;

      const dataToUpdate = processData(metadata, data);

      if (!isEmpty(dataToUpdate)) {
        await this.createQueryBuilder(uid).where({ id }).update(dataToUpdate).execute();
      }

      await this.updateRelations(uid, id, data);

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

      await this.deleteRelations(uid, id);

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
    // TODO: wrap Transaction
    async attachRelations(uid, id, data) {
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
              .execute();
          } else if (targetAttribute.relation === 'morphToMany') {
            const { joinTable } = targetAttribute;
            const { joinColumn, morphColumn } = joinTable;

            const { idColumn, typeColumn } = morphColumn;

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

            if (isEmpty(rows)) {
              continue;
            }

            await this.createQueryBuilder(joinTable.name).insert(rows).execute();
          }

          continue;
        } else if (attribute.relation === 'morphToOne') {
          // handled on the entry itself
          continue;
        } else if (attribute.relation === 'morphToMany') {
          const { joinTable } = attribute;
          const { joinColumn, morphColumn } = joinTable;

          const { idColumn, typeColumn, typeField = '__type' } = morphColumn;

          const rows = cleanRelationData.set.map((data, idx) => ({
            [joinColumn.name]: id,
            [idColumn.name]: data.id,
            [typeColumn.name]: data[typeField],
            ...(joinTable.on || {}),
            ...(data.__pivot || {}),
            order: idx + 1,
          }));

          if (isEmpty(rows)) {
            continue;
          }

          // delete previous relations
          await deleteRelatedMorphOneRelationsAfterMorphToManyUpdate(rows, {
            uid,
            attributeName,
            joinTable,
            db,
          });

          await this.createQueryBuilder(joinTable.name).insert(rows).execute();

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
            .execute();

          await this.createQueryBuilder(target)
            .update({ [attribute.joinColumn.referencedColumn]: id })
            // NOTE: works if it is an array or a single id
            .where({ id: relIdsToAdd })
            .execute();
        }

        if (attribute.joinTable) {
          // need to set the column on the target

          const { joinTable } = attribute;
          const { joinColumn, inverseJoinColumn, orderColumnName, inverseOrderColumnName } =
            joinTable;

          const relsToAdd = cleanRelationData.set || cleanRelationData.connect;
          const relIdsToadd = toIds(relsToAdd);

          await deletePreviousOneToAnyRelations({ id, attribute, relIdsToadd, db });

          // prepare new relations to insert
          const insert = relsToAdd.map((data) => {
            return {
              [joinColumn.name]: id,
              [inverseJoinColumn.name]: data.id,
              ...(joinTable.on || {}),
              ...(data.__pivot || {}),
            };
          });

          // add order value
          if (hasOrderColumn(attribute)) {
            insert.forEach((rel, idx) => {
              rel[orderColumnName] = idx + 1;
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
              .from(joinTable.name);

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
          await this.createQueryBuilder(joinTable.name).insert(insert).execute();
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
              .execute();

            if (!isNull(cleanRelationData.set)) {
              const relId = toIds(cleanRelationData.set[0]);
              await this.createQueryBuilder(target)
                .update({ [idColumn.name]: id, [typeColumn.name]: uid })
                .where({ id: relId })
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
              .execute();

            const rows = cleanRelationData.set.map((data, idx) => ({
              [joinColumn.name]: data.id,
              [idColumn.name]: id,
              [typeColumn.name]: uid,
              ...(joinTable.on || {}),
              ...(data.__pivot || {}),
              order: idx + 1,
              field: attributeName,
            }));

            if (isEmpty(rows)) {
              continue;
            }

            await this.createQueryBuilder(joinTable.name).insert(rows).execute();
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

          const rows = cleanRelationData.set.map((data, idx) => ({
            [joinColumn.name]: id,
            [idColumn.name]: data.id,
            [typeColumn.name]: data[typeField],
            ...(joinTable.on || {}),
            ...(data.__pivot || {}),
            order: idx + 1,
          }));

          if (isEmpty(rows)) {
            continue;
          }

          // delete previous relations
          await deleteRelatedMorphOneRelationsAfterMorphToManyUpdate(rows, {
            uid,
            attributeName,
            joinTable,
            db,
          });

          await this.createQueryBuilder(joinTable.name).insert(rows).execute();

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
            .execute();

          if (!isNull(cleanRelationData.set)) {
            const relIdsToAdd = toIds(cleanRelationData.set);
            await this.createQueryBuilder(target)
              .where({ id: relIdsToAdd })
              .update({ [attribute.joinColumn.referencedColumn]: id })
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
            await deleteRelations({ id, attribute, db, relIdsToDelete: 'all' });
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

              if (isEmpty(cleanRelationData.connect)) {
                continue;
              }

              await deleteRelations({ id, attribute, db, relIdsToDelete });

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
                  .execute();
              }

              // prepare relations to insert
              const insert = cleanRelationData.connect.map((relToAdd) => ({
                [joinColumn.name]: id,
                [inverseJoinColumn.name]: relToAdd.id,
                ...(joinTable.on || {}),
                ...(relToAdd.__pivot || {}),
              }));

              // add order value
              if (hasOrderColumn(attribute)) {
                const orderMax = (
                  await this.createQueryBuilder(joinTable.name)
                    .max(orderColumnName)
                    .where({ [joinColumn.name]: id })
                    .where(joinTable.on || {})
                    .first()
                    .execute()
                ).max;

                insert.forEach((row, idx) => {
                  row[orderColumnName] = orderMax + idx + 1;
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
                  .from(joinTable.name);

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
                .onConflict(joinTable.pivotColumns);

              if (hasOrderColumn(attribute)) {
                query.merge([orderColumnName]);
              } else {
                query.ignore();
              }

              await query.execute();

              // remove gap between orders
              await cleanOrderColumns({ attribute, db, id });
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
              });

              if (isEmpty(cleanRelationData.set)) {
                continue;
              }

              const insert = cleanRelationData.set.map((relToAdd) => ({
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
                  .from(joinTable.name);

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
                .onConflict(joinTable.pivotColumns);

              if (hasOrderColumn(attribute)) {
                query.merge([orderColumnName]);
              } else {
                query.ignore();
              }

              await query.execute();
            }

            // Delete the previous relations for oneToAny relations
            if (!isEmpty(relIdsToaddOrMove)) {
              await deletePreviousOneToAnyRelations({
                id,
                attribute,
                relIdsToadd: relIdsToaddOrMove,
                db,
              });

              // Delete the previous relations for anyToOne relations
              await deletePreviousAnyToOneRelations({
                id,
                attribute,
                relIdToadd: relIdsToaddOrMove[0],
                db,
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
    // TODO: wrap Transaction
    async deleteRelations(uid, id) {
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
            .execute();
        }

        if (attribute.joinTable) {
          await deleteRelations({ id, attribute, db, relIdsToDelete: 'all' });
        }
      }
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
