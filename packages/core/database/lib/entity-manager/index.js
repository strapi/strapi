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
  uniqBy,
  differenceBy,
  groupBy,
} = require('lodash/fp');
const types = require('../types');
const { createField } = require('../fields');
const { createQueryBuilder } = require('../query');
const { createRepository } = require('./entity-repository');
const { deleteRelatedMorphOneRelationsAfterMorphToManyUpdate } = require('./morph-relations');
const {
  isBidirectional,
  isOneToAny,
  isManyToAny,
  isAnyToOne,
  isAnyToMany,
} = require('../metadata/relations');

const toId = (value) => value.id || value;
const toIds = (value) => castArray(value || []).map(toId);

const isValidId = (value) => isString(value) || isInteger(value);
const toAssocs = (data) => {
  if (data?.connect || data?.disconnect || (isPlainObject(data) && !data.id)) {
    return {
      connect: toAssocs(data.connect),
      disconnect: toAssocs(data.disconnect),
    };
  }

  return castArray(data)
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

        if (attribute.relation === 'morphOne' || attribute.relation === 'morphMany') {
          const { target, morphBy } = attribute;

          const targetAttribute = db.metadata.get(target).attributes[morphBy];

          if (targetAttribute.relation === 'morphToOne') {
            // set columns
            const { idColumn, typeColumn } = targetAttribute.morphColumn;

            await this.createQueryBuilder(target)
              .update({ [idColumn.name]: id, [typeColumn.name]: uid })
              .where({ id: toId(data[attributeName]) })
              .execute();
          } else if (targetAttribute.relation === 'morphToMany') {
            const { joinTable } = targetAttribute;
            const { joinColumn, morphColumn } = joinTable;

            const { idColumn, typeColumn } = morphColumn;

            const rows = toAssocs(data[attributeName]).map((data, idx) => {
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

          const rows = toAssocs(data[attributeName]).map((data) => ({
            [joinColumn.name]: id,
            [idColumn.name]: data.id,
            [typeColumn.name]: data[typeField],
            ...(joinTable.on || {}),
            ...(data.__pivot || {}),
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
          const { joinColumn, inverseJoinColumn, orderColumnName, inverseOrderColumnName } =
            joinTable;
          const select = [joinColumn.name];
          if (isAnyToMany(attribute)) {
            select.push(orderColumnName);
          }

          const cleanRelationData = toAssocs(data[attributeName]);
          const relsToAdd = uniqBy('id', cleanRelationData.connect || cleanRelationData);
          const relIdsToadd = toIds(relsToAdd);

          // need to delete the previous relations for oneToAny relations
          if (isBidirectional(attribute) && isOneToAny(attribute)) {
            // update orders for previous oneToAny relations that will be deleted if it has order (oneToMany)
            if (isAnyToMany(attribute)) {
              const currentRelsToDelete = await this.createQueryBuilder(joinTable.name)
                .select(select)
                .where({
                  [inverseJoinColumn.name]: relIdsToadd,
                  [joinColumn.name]: { $ne: id },
                })
                .where(joinTable.on || {})
                .execute();

              currentRelsToDelete.sort((a, b) => b[orderColumnName] - a[orderColumnName]);

              for (const relToDelete of currentRelsToDelete) {
                await this.createQueryBuilder(joinTable.name)
                  .update({
                    [orderColumnName]: db
                      .getConnection()
                      .raw('?? - 1', relToDelete[orderColumnName]),
                  })
                  .where({
                    [joinColumn.name]: relToDelete[joinColumn.name],
                    [orderColumnName]: { $gt: relToDelete[orderColumnName] },
                  })
                  .where(joinTable.on || {})
                  .execute();
              }
            }

            // delete previous oneToAny relations
            await this.createQueryBuilder(joinTable.name)
              .delete()
              .where({ [inverseJoinColumn.name]: relIdsToadd })
              .where(joinTable.on || {})
              .execute();
          }

          // prepare new relations to insert
          const insert = relsToAdd.map((data) => {
            return {
              [joinColumn.name]: id,
              [inverseJoinColumn.name]: data.id,
              ...(joinTable.on || {}),
              ...(data.__pivot || {}),
            };
          });

          // add order value when relevant
          if (isAnyToMany(attribute)) {
            insert.forEach((rel, idx) => {
              rel[orderColumnName] = idx + 1;
            });
          }
          // add inv_order value when relevant
          if (isBidirectional(attribute) && isManyToAny(attribute)) {
            const maxMap = {};
            await Promise.all(
              relIdsToadd.map(async (relId) => {
                const { max } = await this.createQueryBuilder(joinTable.name)
                  .max(inverseOrderColumnName)
                  .where({ [inverseJoinColumn.name]: relId })
                  .where(joinTable.on || {})
                  .first()
                  .execute();

                maxMap[relId] = max;
              })
            );

            insert.forEach((rel) => {
              rel[inverseOrderColumnName] = maxMap[rel[inverseJoinColumn.name]] + 1;
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

            if (!isNull(data[attributeName])) {
              await this.createQueryBuilder(target)
                .update({ [idColumn.name]: id, [typeColumn.name]: uid })
                .where({ id: toId(data[attributeName]) })
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

            const rows = toAssocs(data[attributeName]).map((data, idx) => ({
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

          const rows = toAssocs(data[attributeName]).map((data) => ({
            [joinColumn.name]: id,
            [idColumn.name]: data.id,
            [typeColumn.name]: data[typeField],
            ...(joinTable.on || {}),
            ...(data.__pivot || {}),
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

          if (!isNull(data[attributeName])) {
            await this.createQueryBuilder(target)
              // NOTE: works if it is an array or a single id
              .where({ id: data[attributeName] })
              .update({ [attribute.joinColumn.referencedColumn]: id })
              .execute();
          }
        }

        if (attribute.joinTable) {
          const { joinTable } = attribute;
          const { joinColumn, inverseJoinColumn, orderColumnName, inverseOrderColumnName } =
            joinTable;
          const select = [joinColumn.name, inverseJoinColumn.name];
          if (isAnyToMany(attribute)) {
            select.push(orderColumnName);
          }
          if (isBidirectional(attribute) && isManyToAny(attribute)) {
            select.push(inverseOrderColumnName);
          }

          // only delete relations
          if (isNull(data[attributeName])) {
            // INVERSE ORDER UPDATE
            if (isBidirectional(attribute) && isManyToAny(attribute)) {
              let lastId = 0;
              let done = false;
              const batchSize = 100;
              while (!done) {
                const relsToDelete = await this.createQueryBuilder(joinTable.name)
                  .select(select)
                  .where({
                    [joinColumn.name]: id,
                    id: { $gt: lastId },
                  })
                  .where(joinTable.on || {})
                  .orderBy('id')
                  .limit(batchSize)
                  .execute();
                // TODO: cannot put pivot here...
                done = relsToDelete.length < batchSize;
                lastId = relsToDelete[relsToDelete.length - 1]?.id;

                const updateInverseOrderPromises = [];
                for (const relToDelete of relsToDelete) {
                  const updatePromise = this.createQueryBuilder(joinTable.name)
                    .update({
                      [inverseOrderColumnName]: db
                        .getConnection()
                        .raw('?? - 1', relToDelete[inverseOrderColumnName]),
                    })
                    .where({
                      [inverseJoinColumn.name]: relToDelete[inverseJoinColumn.name],
                      [inverseOrderColumnName]: { $gt: relToDelete[inverseOrderColumnName] },
                    })
                    .where(joinTable.on || {})
                    .execute();
                  updateInverseOrderPromises.push(updatePromise);
                }

                await Promise.all(updateInverseOrderPromises);
              }
            }

            await this.createQueryBuilder(joinTable.name)
              .delete()
              .where({ [joinColumn.name]: id })
              .where(joinTable.on || {})
              .execute();
          } else {
            const cleanRelationData = toAssocs(data[attributeName]);
            const isPartialUpdate =
              has('connect', cleanRelationData) || has('disconnect', cleanRelationData);
            let relIdsToaddOrMove;

            if (isPartialUpdate) {
              // does not support pivot
              let connect = uniqBy('id', cleanRelationData.connect || []);
              let disconnect = uniqBy('id', cleanRelationData.disconnect || []);
              if (isAnyToOne(attribute)) {
                connect = connect.slice(-1);
                disconnect = [];
              }
              relIdsToaddOrMove = toIds(connect);
              // DELETE relations in disconnect
              const relIdsToDelete = toIds(differenceBy('id', disconnect, connect));

              // UPDATE RELEVANT ORDERS
              if (
                isAnyToMany(attribute) ||
                (isBidirectional(attribute) && isManyToAny(attribute))
              ) {
                const relsToDelete = await this.createQueryBuilder(joinTable.name)
                  .select(select)
                  .where({
                    [joinColumn.name]: id,
                    [inverseJoinColumn.name]: { $in: relIdsToDelete },
                  })
                  .where(joinTable.on || {})
                  .execute();

                // ORDER UPDATE
                if (isAnyToMany(attribute)) {
                  // sort by order DESC so that the order updates are done in the correct order
                  // avoiding one to interfere with the others
                  relsToDelete.sort((a, b) => b[orderColumnName] - a[orderColumnName]);

                  for (const relToDelete of relsToDelete) {
                    await this.createQueryBuilder(joinTable.name)
                      .update({
                        [orderColumnName]: db
                          .getConnection()
                          .raw('?? - 1', relToDelete[orderColumnName]),
                      })
                      .where({
                        [joinColumn.name]: id,
                        [orderColumnName]: { $gt: relToDelete[orderColumnName] },
                      })
                      .where(joinTable.on || {})
                      .execute();
                  }
                }

                // INVERSE ORDER UPDATE
                if (isBidirectional(attribute) && isManyToAny(attribute)) {
                  const updateInverseOrderPromises = [];
                  for (const relToDelete of relsToDelete) {
                    const updatePromise = this.createQueryBuilder(joinTable.name)
                      .update({
                        [inverseOrderColumnName]: db
                          .getConnection()
                          .raw('?? - 1', relToDelete[inverseOrderColumnName]),
                      })
                      .where({
                        [inverseJoinColumn.name]: relToDelete[inverseJoinColumn.name],
                        [inverseOrderColumnName]: { $gt: relToDelete[inverseOrderColumnName] },
                      })
                      .where(joinTable.on || {})
                      .execute();
                    updateInverseOrderPromises.push(updatePromise);
                  }

                  await Promise.all(updateInverseOrderPromises);
                }
              }

              // DELETE
              await this.createQueryBuilder(joinTable.name)
                .delete()
                .where({
                  [joinColumn.name]: id,
                  [inverseJoinColumn.name]: { $in: relIdsToDelete },
                })
                .where(joinTable.on || {})
                .execute();

              // add/move
              let max;
              const currentMovingRels = await this.createQueryBuilder(joinTable.name)
                .select(select)
                .where({
                  [joinColumn.name]: id,
                  [inverseJoinColumn.name]: { $in: relIdsToaddOrMove },
                })
                .where(joinTable.on || {})
                .execute();
              const currentMovingRelsMap = groupBy(inverseJoinColumn.name, currentMovingRels);

              if (isAnyToMany(attribute)) {
                max = (
                  await this.createQueryBuilder(joinTable.name)
                    .max(orderColumnName)
                    .where({ [joinColumn.name]: id })
                    .where(joinTable.on || {})
                    .first()
                    .execute()
                ).max;
              }

              for (const relToAddOrMove of connect) {
                // const currentRel = currentMovingRelsMap[relToAddOrMove.id]?.[0];
                const currentRel = currentMovingRelsMap[relToAddOrMove.id]?.[0];
                if (currentRel && isAnyToMany(attribute)) {
                  await this.createQueryBuilder(joinTable.name)
                    .update({
                      [orderColumnName]: db
                        .getConnection()
                        .raw('?? - 1', currentRel[orderColumnName]),
                    })
                    .where({
                      [joinColumn.name]: id,
                      [orderColumnName]: { $gt: currentRel[orderColumnName] },
                    })
                    .where(joinTable.on || {})
                    .execute();

                  currentMovingRels.forEach((rel) => {
                    if (rel[orderColumnName] > currentRel[orderColumnName]) {
                      rel[orderColumnName] -= 1;
                    }
                  });

                  await this.createQueryBuilder(joinTable.name)
                    .update({
                      [orderColumnName]: max,
                    })
                    .where({
                      [joinColumn.name]: id,
                      [inverseJoinColumn.name]: relToAddOrMove.id,
                    })
                    .where(joinTable.on || {})
                    .execute();
                } else if (!currentRel) {
                  const insert = {
                    [joinColumn.name]: id,
                    [inverseJoinColumn.name]: relToAddOrMove.id,
                    ...(relToAddOrMove.__pivot || {}),
                  };

                  if (isAnyToMany(attribute)) {
                    insert[orderColumnName] = max + 1;
                  }

                  if (isBidirectional(attribute) && isManyToAny(attribute)) {
                    const { max: reverseMax } = await this.createQueryBuilder(joinTable.name)
                      .max(inverseOrderColumnName)
                      .where({ [inverseJoinColumn.name]: relToAddOrMove.id })
                      .where(joinTable.on || {})
                      .first()
                      .execute();

                    insert[inverseOrderColumnName] = reverseMax + 1;
                  }

                  await this.createQueryBuilder(joinTable.name).insert(insert).execute();
                  max += 1;
                }
              }
            } else {
              // overwrite all relations
              const relsToAdd = uniqBy('id', cleanRelationData);
              relIdsToaddOrMove = toIds(relsToAdd);

              // UPDATE RELEVANT ORDERS BEFORE DELETE
              if (isAnyToMany(attribute) || isManyToAny(attribute)) {
                let lastId = 0;
                let done = false;
                const batchSize = 100;
                while (!done) {
                  const relsToDelete = await this.createQueryBuilder(joinTable.name)
                    .select(select)
                    .where({
                      [joinColumn.name]: id,
                      [inverseJoinColumn.name]: { $notIn: relIdsToaddOrMove },
                      id: { $gt: lastId },
                    })
                    .where(joinTable.on || {})
                    .orderBy('id')
                    .limit(batchSize)
                    .execute();

                  done = relsToDelete.length < batchSize;
                  lastId = relsToDelete[relsToDelete.length - 1]?.id;

                  // ORDER UPDATE
                  if (isAnyToMany(attribute)) {
                    // sort by order DESC so that the order updates are done in the correct order
                    // avoiding one to interfere with the others
                    relsToDelete.sort((a, b) => b[orderColumnName] - a[orderColumnName]);

                    for (const relToDelete of relsToDelete) {
                      await this.createQueryBuilder(joinTable.name)
                        .update({
                          [orderColumnName]: db
                            .getConnection()
                            .raw('?? - 1', relToDelete[orderColumnName]),
                        })
                        .where({
                          [joinColumn.name]: id,
                          [orderColumnName]: { $gt: relToDelete[orderColumnName] },
                        })
                        .where(joinTable.on || {})
                        // manque le pivot ici
                        .execute();
                    }
                  }

                  // INVERSE ORDER UPDATE
                  if (isBidirectional(attribute) && isManyToAny(attribute)) {
                    const updateInverseOrderPromises = [];
                    for (const relToDelete of relsToDelete) {
                      const updatePromise = this.createQueryBuilder(joinTable.name)
                        .update({
                          [inverseOrderColumnName]: db
                            .getConnection()
                            .raw('?? - 1', relToDelete[inverseOrderColumnName]),
                        })
                        .where({
                          [inverseJoinColumn.name]: relToDelete[inverseJoinColumn.name],
                          [inverseOrderColumnName]: { $gt: relToDelete[inverseOrderColumnName] },
                        })
                        .where(joinTable.on || {})
                        .execute();
                      updateInverseOrderPromises.push(updatePromise);
                    }

                    await Promise.all(updateInverseOrderPromises);
                  }
                }
              }

              // DELETE
              await this.createQueryBuilder(joinTable.name)
                .delete()
                .where({
                  [joinColumn.name]: id,
                  [inverseJoinColumn.name]: { $notIn: relIdsToaddOrMove },
                })
                .where(joinTable.on || {})
                .execute();

              const currentMovingRels = await this.createQueryBuilder(joinTable.name)
                .select(select)
                .where({
                  [joinColumn.name]: id,
                  [inverseJoinColumn.name]: { $in: relIdsToaddOrMove },
                })
                .where(joinTable.on || {})
                .execute();
              const currentMovingRelsMap = groupBy(inverseJoinColumn.name, currentMovingRels);

              let max = 0;
              for (const relToAdd of relsToAdd) {
                const currentRel = currentMovingRelsMap[relToAdd.id]?.[0];

                if (currentRel && isAnyToMany(attribute)) {
                  const update = { [orderColumnName]: max + 1 };
                  await this.createQueryBuilder(joinTable.name)
                    .update(update)
                    .where({
                      [joinColumn.name]: id,
                      [inverseJoinColumn.name]: relToAdd.id,
                    })
                    .where(joinTable.on || {})
                    .execute();
                } else if (!currentRel) {
                  const insert = {
                    [joinColumn.name]: id,
                    [inverseJoinColumn.name]: relToAdd.id,
                    ...(relToAdd.__pivot || {}),
                  };

                  if (isAnyToMany(attribute)) {
                    insert[orderColumnName] = max + 1;
                  }
                  // can be optimized in one query
                  if (isBidirectional(attribute) && isManyToAny(attribute)) {
                    const { max: reverseMax } = await this.createQueryBuilder(joinTable.name)
                      .max(inverseOrderColumnName)
                      .where({ [inverseJoinColumn.name]: id })
                      .where(joinTable.on || {})
                      .first()
                      .execute();

                    insert[inverseOrderColumnName] = reverseMax + 1;
                  }

                  await this.createQueryBuilder(joinTable.name).insert(insert).execute();
                }
                max += 1;
              }
            }

            // Delete the previous relations for oneToAny relations
            if (isBidirectional(attribute) && isOneToAny(attribute)) {
              // update orders for previous oneToAny relations that will be deleted if it has order (oneToMany)
              if (isAnyToMany(attribute)) {
                const currentRelsToDelete = await this.createQueryBuilder(joinTable.name)
                  .select(select)
                  .where({
                    [inverseJoinColumn.name]: relIdsToaddOrMove,
                    [joinColumn.name]: { $ne: id },
                  })
                  .where(joinTable.on || {})
                  .execute();

                currentRelsToDelete.sort((a, b) => b[orderColumnName] - a[orderColumnName]);

                for (const relToDelete of currentRelsToDelete) {
                  await this.createQueryBuilder(joinTable.name)
                    .update({
                      [orderColumnName]: db
                        .getConnection()
                        .raw('?? - 1', relToDelete[orderColumnName]),
                    })
                    .where({
                      [joinColumn.name]: relToDelete[joinColumn.name],
                      [orderColumnName]: { $gt: relToDelete[orderColumnName] },
                    })
                    .where(joinTable.on || {})
                    .execute();
                }
              }

              // delete previous oneToAny relations
              await this.createQueryBuilder(joinTable.name)
                .delete()
                .where({
                  [inverseJoinColumn.name]: relIdsToaddOrMove,
                  [joinColumn.name]: { $ne: id },
                })
                .where(joinTable.on || {})
                .execute();
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
          const { joinTable } = attribute;
          const { joinColumn, inverseJoinColumn, inverseOrderColumnName } = joinTable;

          // INVERSE ORDER UPDATE
          if (isBidirectional(attribute) && isManyToAny(attribute)) {
            let lastId = 0;
            let done = false;
            const batchSize = 100;
            while (!done) {
              const relsToDelete = await this.createQueryBuilder(joinTable.name)
                .select(inverseJoinColumn.name, inverseOrderColumnName)
                .where({
                  [joinColumn.name]: id,
                  id: { $gt: lastId },
                })
                .where(joinTable.on || {})
                .orderBy('id')
                .limit(batchSize)
                .execute();
              done = relsToDelete.length < batchSize;
              lastId = relsToDelete[relsToDelete.length - 1]?.id;

              const updateInverseOrderPromises = [];
              for (const relToDelete of relsToDelete) {
                const updatePromise = this.createQueryBuilder(joinTable.name)
                  .update({
                    [inverseOrderColumnName]: db
                      .getConnection()
                      .raw('?? - 1', relToDelete[inverseOrderColumnName]),
                  })
                  .where({
                    [inverseJoinColumn.name]: relToDelete[inverseJoinColumn.name],
                    [inverseOrderColumnName]: { $gt: relToDelete[inverseOrderColumnName] },
                  })
                  .where(joinTable.on || {})
                  .execute();
                updateInverseOrderPromises.push(updatePromise);
              }

              await Promise.all(updateInverseOrderPromises);
            }
          }

          await this.createQueryBuilder(joinTable.name)
            .delete()
            .where({ [joinColumn.name]: id })
            .where(joinTable.on || {})
            .execute();
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
