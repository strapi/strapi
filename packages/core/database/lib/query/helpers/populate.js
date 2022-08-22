'use strict';

const _ = require('lodash/fp');

const types = require('../../types');
const { fromRow } = require('./transform');

const getRootLevelPopulate = (meta) => {
  const populate = {};

  for (const attributeName in meta.attributes) {
    const attribute = meta.attributes[attributeName];
    if (attribute.type === 'relation') {
      populate[attributeName] = true;
    }
  }

  return populate;
};

/**
 * Converts and prepares the query for populate
 *
 * @param {boolean|string[]|object} populate populate param
 * @param {object} ctx query context
 * @param {object} ctx.db database instance
 * @param {object} ctx.qb query builder instance
 * @param {string} ctx.uid model uid
 */
const processPopulate = (populate, ctx) => {
  const { qb, db, uid } = ctx;
  const meta = db.metadata.get(uid);

  let populateMap = {};

  if (populate === false || _.isNil(populate)) {
    return null;
  }

  if (populate === true) {
    populateMap = getRootLevelPopulate(meta);
  } else if (Array.isArray(populate)) {
    for (const key of populate) {
      const [root, ...rest] = key.split('.');

      if (rest.length > 0) {
        const subPopulate = rest.join('.');

        if (populateMap[root]) {
          if (populateMap[root] === true) {
            populateMap[root] = {
              populate: [subPopulate],
            };
          } else {
            populateMap[root].populate = [subPopulate].concat(populateMap[root].populate || []);
          }
        } else {
          populateMap[root] = {
            populate: [subPopulate],
          };
        }
      } else {
        populateMap[root] = populateMap[root] ? populateMap[root] : true;
      }
    }
  } else {
    populateMap = populate;
  }

  if (!_.isPlainObject(populateMap)) {
    throw new Error('Populate must be an object');
  }

  const finalPopulate = {};
  for (const key in populateMap) {
    const attribute = meta.attributes[key];

    if (!attribute) {
      continue;
    }

    if (!types.isRelation(attribute.type)) {
      continue;
    }

    if (populateMap[key] === false) {
      continue;
    }

    // make sure id is present for future populate queries
    if (_.has('id', meta.attributes)) {
      qb.addSelect('id');
    }

    finalPopulate[key] = populateMap[key];
  }

  return finalPopulate;
};

//  TODO: Omit limit & offset to avoid needing a query per result to avoid making too many queries
const pickPopulateParams = _.pick([
  'select',
  'count',
  'where',
  'populate',
  'orderBy',
  'limit',
  'offset',
  'filters',
]);

// TODO: cleanup code
// TODO: create aliases for pivot columns
// TODO: optimize depth to avoid overfetching
// TODO: handle count for join columns
// TODO: cleanup count
const applyPopulate = async (results, populate, ctx) => {
  const { db, uid, qb } = ctx;
  const meta = db.metadata.get(uid);

  if (_.isEmpty(results)) {
    return results;
  }

  for (const key in populate) {
    const attribute = meta.attributes[key];
    const targetMeta = db.metadata.get(attribute.target);

    const populateValue = {
      filters: qb.state.filters,
      ...pickPopulateParams(populate[key]),
    };

    const isCount = populateValue.count === true;

    const fromTargetRow = (rowOrRows) => fromRow(targetMeta, rowOrRows);

    if (attribute.relation === 'oneToOne' || attribute.relation === 'manyToOne') {
      if (attribute.joinColumn) {
        const { name: joinColumnName, referencedColumn: referencedColumnName } =
          attribute.joinColumn;

        const referencedValues = _.uniq(
          results.map((r) => r[joinColumnName]).filter((value) => !_.isNil(value))
        );

        if (_.isEmpty(referencedValues)) {
          results.forEach((result) => {
            result[key] = null;
          });

          continue;
        }

        const rows = await db.entityManager
          .createQueryBuilder(targetMeta.uid)
          .init(populateValue)
          .addSelect(`${qb.alias}.${referencedColumnName}`)
          .where({ [referencedColumnName]: referencedValues })
          .execute({ mapResults: false });

        const map = _.groupBy(referencedColumnName, rows);

        results.forEach((result) => {
          result[key] = fromTargetRow(_.first(map[result[joinColumnName]]));
        });

        continue;
      }

      if (attribute.joinTable) {
        const { joinTable } = attribute;

        const qb = db.entityManager.createQueryBuilder(targetMeta.uid);

        const { name: joinColumnName, referencedColumn: referencedColumnName } =
          joinTable.joinColumn;

        const alias = qb.getAlias();
        const joinColAlias = `${alias}.${joinColumnName}`;

        const referencedValues = _.uniq(
          results.map((r) => r[referencedColumnName]).filter((value) => !_.isNil(value))
        );

        if (_.isEmpty(referencedValues)) {
          results.forEach((result) => {
            result[key] = null;
          });
          continue;
        }

        const rows = await qb
          .init(populateValue)
          .join({
            alias,
            referencedTable: joinTable.name,
            referencedColumn: joinTable.inverseJoinColumn.name,
            rootColumn: joinTable.inverseJoinColumn.referencedColumn,
            rootTable: qb.alias,
            on: joinTable.on,
            orderBy: joinTable.orderBy,
          })
          .addSelect(joinColAlias)
          .where({ [joinColAlias]: referencedValues })
          .execute({ mapResults: false });

        const map = _.groupBy(joinColumnName, rows);

        results.forEach((result) => {
          result[key] = fromTargetRow(_.first(map[result[referencedColumnName]]));
        });

        continue;
      }

      continue;
    } else if (attribute.relation === 'oneToMany') {
      if (attribute.joinColumn) {
        const { name: joinColumnName, referencedColumn: referencedColumnName } =
          attribute.joinColumn;

        const referencedValues = _.uniq(
          results.map((r) => r[joinColumnName]).filter((value) => !_.isNil(value))
        );

        if (_.isEmpty(referencedValues)) {
          results.forEach((result) => {
            result[key] = null;
          });
          continue;
        }

        const rows = await db.entityManager
          .createQueryBuilder(targetMeta.uid)
          .init(populateValue)
          .addSelect(`${qb.alias}.${referencedColumnName}`)
          .where({ [referencedColumnName]: referencedValues })
          .execute({ mapResults: false });

        const map = _.groupBy(referencedColumnName, rows);

        results.forEach((result) => {
          result[key] = fromTargetRow(map[result[joinColumnName]] || []);
        });

        continue;
      }

      if (attribute.joinTable) {
        const { joinTable } = attribute;

        const qb = db.entityManager.createQueryBuilder(targetMeta.uid);

        const { name: joinColumnName, referencedColumn: referencedColumnName } =
          joinTable.joinColumn;

        const alias = qb.getAlias();
        const joinColAlias = `${alias}.${joinColumnName}`;

        const referencedValues = _.uniq(
          results.map((r) => r[referencedColumnName]).filter((value) => !_.isNil(value))
        );

        if (isCount) {
          if (_.isEmpty(referencedValues)) {
            results.forEach((result) => {
              result[key] = { count: 0 };
            });
            continue;
          }

          const rows = await qb
            .init(populateValue)
            .join({
              alias,
              referencedTable: joinTable.name,
              referencedColumn: joinTable.inverseJoinColumn.name,
              rootColumn: joinTable.inverseJoinColumn.referencedColumn,
              rootTable: qb.alias,
              on: joinTable.on,
            })
            .select([joinColAlias, qb.raw('count(*) AS count')])
            .where({ [joinColAlias]: referencedValues })
            .groupBy(joinColAlias)
            .execute({ mapResults: false });

          const map = rows.reduce((map, row) => {
            map[row[joinColumnName]] = { count: Number(row.count) };
            return map;
          }, {});

          results.forEach((result) => {
            result[key] = map[result[referencedColumnName]] || { count: 0 };
          });

          continue;
        }

        if (_.isEmpty(referencedValues)) {
          results.forEach((result) => {
            result[key] = [];
          });
          continue;
        }

        const rows = await qb
          .init(populateValue)
          .join({
            alias,
            referencedTable: joinTable.name,
            referencedColumn: joinTable.inverseJoinColumn.name,
            rootColumn: joinTable.inverseJoinColumn.referencedColumn,
            rootTable: qb.alias,
            on: joinTable.on,
            orderBy: joinTable.orderBy,
          })
          .addSelect(joinColAlias)
          .where({ [joinColAlias]: referencedValues })
          .execute({ mapResults: false });

        const map = _.groupBy(joinColumnName, rows);

        results.forEach((r) => {
          r[key] = fromTargetRow(map[r[referencedColumnName]] || []);
        });
        continue;
      }

      continue;
    } else if (attribute.relation === 'manyToMany') {
      const { joinTable } = attribute;

      const qb = db.entityManager.createQueryBuilder(targetMeta.uid);

      const { name: joinColumnName, referencedColumn: referencedColumnName } = joinTable.joinColumn;

      const alias = qb.getAlias();
      const joinColAlias = `${alias}.${joinColumnName}`;
      const referencedValues = _.uniq(
        results.map((r) => r[referencedColumnName]).filter((value) => !_.isNil(value))
      );

      if (isCount) {
        if (_.isEmpty(referencedValues)) {
          results.forEach((result) => {
            result[key] = { count: 0 };
          });
          continue;
        }

        const rows = await qb
          .init(populateValue)
          .join({
            alias,
            referencedTable: joinTable.name,
            referencedColumn: joinTable.inverseJoinColumn.name,
            rootColumn: joinTable.inverseJoinColumn.referencedColumn,
            rootTable: qb.alias,
            on: joinTable.on,
          })
          .select([joinColAlias, qb.raw('count(*) AS count')])
          .where({ [joinColAlias]: referencedValues })
          .groupBy(joinColAlias)
          .execute({ mapResults: false });

        const map = rows.reduce((map, row) => {
          map[row[joinColumnName]] = { count: Number(row.count) };
          return map;
        }, {});

        results.forEach((result) => {
          result[key] = map[result[referencedColumnName]] || { count: 0 };
        });

        continue;
      }

      if (_.isEmpty(referencedValues)) {
        results.forEach((result) => {
          result[key] = [];
        });
        continue;
      }

      const rows = await qb
        .init(populateValue)
        .join({
          alias,
          referencedTable: joinTable.name,
          referencedColumn: joinTable.inverseJoinColumn.name,
          rootColumn: joinTable.inverseJoinColumn.referencedColumn,
          rootTable: qb.alias,
          on: joinTable.on,
          orderBy: joinTable.orderBy,
        })
        .addSelect(joinColAlias)
        .where({ [joinColAlias]: referencedValues })
        .execute({ mapResults: false });

      const map = _.groupBy(joinColumnName, rows);

      results.forEach((result) => {
        result[key] = fromTargetRow(map[result[referencedColumnName]] || []);
      });

      continue;
    } else if (['morphOne', 'morphMany'].includes(attribute.relation)) {
      const { target, morphBy } = attribute;

      const targetAttribute = db.metadata.get(target).attributes[morphBy];

      if (targetAttribute.relation === 'morphToOne') {
        const { idColumn, typeColumn } = targetAttribute.morphColumn;

        const referencedValues = _.uniq(
          results.map((r) => r[idColumn.referencedColumn]).filter((value) => !_.isNil(value))
        );

        if (_.isEmpty(referencedValues)) {
          results.forEach((result) => {
            result[key] = null;
          });

          continue;
        }

        const rows = await db.entityManager
          .createQueryBuilder(target)
          .init(populateValue)
          // .addSelect(`${qb.alias}.${idColumn.referencedColumn}`)
          .where({ [idColumn.name]: referencedValues, [typeColumn.name]: uid })
          .execute({ mapResults: false });

        const map = _.groupBy(idColumn.name, rows);

        results.forEach((result) => {
          const matchingRows = map[result[idColumn.referencedColumn]];

          const matchingValue =
            attribute.relation === 'morphOne' ? _.first(matchingRows) : matchingRows;

          result[key] = fromTargetRow(matchingValue);
        });
      } else if (targetAttribute.relation === 'morphToMany') {
        const { joinTable } = targetAttribute;

        const { joinColumn, morphColumn } = joinTable;

        const { idColumn, typeColumn } = morphColumn;

        const referencedValues = _.uniq(
          results.map((r) => r[idColumn.referencedColumn]).filter((value) => !_.isNil(value))
        );

        if (_.isEmpty(referencedValues)) {
          results.forEach((result) => {
            result[key] = attribute.relation === 'morphOne' ? null : [];
          });

          continue;
        }

        // find with join table
        const qb = db.entityManager.createQueryBuilder(target);

        const alias = qb.getAlias();

        const rows = await qb
          .init(populateValue)
          .join({
            alias,
            referencedTable: joinTable.name,
            referencedColumn: joinColumn.name,
            rootColumn: joinColumn.referencedColumn,
            rootTable: qb.alias,
            on: {
              ...(joinTable.on || {}),
              field: key,
            },
            orderBy: joinTable.orderBy,
          })
          .addSelect([`${alias}.${idColumn.name}`, `${alias}.${typeColumn.name}`])
          .where({
            [`${alias}.${idColumn.name}`]: referencedValues,
            [`${alias}.${typeColumn.name}`]: uid,
          })
          .execute({ mapResults: false });

        const map = _.groupBy(idColumn.name, rows);

        results.forEach((result) => {
          const matchingRows = map[result[idColumn.referencedColumn]];

          const matchingValue =
            attribute.relation === 'morphOne' ? _.first(matchingRows) : matchingRows;

          result[key] = fromTargetRow(matchingValue);
        });
      }

      continue;
    } else if (attribute.relation === 'morphToMany') {
      // find with join table
      const { joinTable } = attribute;

      const { joinColumn, morphColumn } = joinTable;
      const { idColumn, typeColumn, typeField = '__type' } = morphColumn;

      // fetch join table to create the ids map then do the same as morphToOne without the first

      const referencedValues = _.uniq(
        results.map((r) => r[joinColumn.referencedColumn]).filter((value) => !_.isNil(value))
      );

      const qb = db.entityManager.createQueryBuilder(joinTable.name);

      const joinRows = await qb
        .where({
          [joinColumn.name]: referencedValues,
          ...(joinTable.on || {}),
        })
        .orderBy([joinColumn.name, 'order'])
        .execute({ mapResults: false });

      const joinMap = _.groupBy(joinColumn.name, joinRows);

      const idsByType = joinRows.reduce((acc, result) => {
        const idValue = result[morphColumn.idColumn.name];
        const typeValue = result[morphColumn.typeColumn.name];

        if (!idValue || !typeValue) {
          return acc;
        }

        if (!_.has(typeValue, acc)) {
          acc[typeValue] = [];
        }

        acc[typeValue].push(idValue);

        return acc;
      }, {});

      const map = {};
      for (const type in idsByType) {
        const ids = idsByType[type];

        // type was removed but still in morph relation
        if (!db.metadata.get(type)) {
          map[type] = {};
          continue;
        }

        const qb = db.entityManager.createQueryBuilder(type);

        const rows = await qb
          .init(populateValue)
          .addSelect(`${qb.alias}.${idColumn.referencedColumn}`)
          .where({ [idColumn.referencedColumn]: ids })
          .execute({ mapResults: false });

        map[type] = _.groupBy(idColumn.referencedColumn, rows);
      }

      results.forEach((result) => {
        const joinResults = joinMap[result[joinColumn.referencedColumn]] || [];

        const matchingRows = joinResults.flatMap((joinResult) => {
          const id = joinResult[idColumn.name];
          const type = joinResult[typeColumn.name];

          const fromTargetRow = (rowOrRows) => fromRow(db.metadata.get(type), rowOrRows);

          return (map[type][id] || []).map((row) => {
            return {
              [typeField]: type,
              ...fromTargetRow(row),
            };
          });
        });

        result[key] = matchingRows;
      });
    } else if (attribute.relation === 'morphToOne') {
      const { morphColumn } = attribute;
      const { idColumn, typeColumn } = morphColumn;

      // make a map for each type what ids to return
      // make a nested map per id

      const idsByType = results.reduce((acc, result) => {
        const idValue = result[morphColumn.idColumn.name];
        const typeValue = result[morphColumn.typeColumn.name];

        if (!idValue || !typeValue) {
          return acc;
        }

        if (!_.has(typeValue, acc)) {
          acc[typeValue] = [];
        }

        acc[typeValue].push(idValue);

        return acc;
      }, {});

      const map = {};
      for (const type in idsByType) {
        const ids = idsByType[type];

        // type was removed but still in morph relation
        if (!db.metadata.get(type)) {
          map[type] = {};
          continue;
        }

        const qb = db.entityManager.createQueryBuilder(type);

        const rows = await qb
          .init(populateValue)
          .addSelect(`${qb.alias}.${idColumn.referencedColumn}`)
          .where({ [idColumn.referencedColumn]: ids })
          .execute({ mapResults: false });

        map[type] = _.groupBy(idColumn.referencedColumn, rows);
      }

      results.forEach((result) => {
        const id = result[idColumn.name];
        const type = result[typeColumn.name];

        if (!type || !id) {
          result[key] = null;
          return;
        }

        const matchingRows = map[type][id];

        const fromTargetRow = (rowOrRows) => fromRow(db.metadata.get(type), rowOrRows);

        result[key] = fromTargetRow(_.first(matchingRows));
      });
    }
  }
};

module.exports = {
  processPopulate,
  applyPopulate,
};
