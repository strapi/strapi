'use strict';

const _ = require('lodash/fp');

const { fromRow } = require('../transform');

/**
 * Populate oneToOne and manyToOne relation
 * @param {*} input
 * @param {*} ctx
 * @returns
 */
const XtoOne = async (input, ctx) => {
  const { attribute, attributeName, results, populateValue, targetMeta, isCount } = input;
  const { db, qb } = ctx;

  const fromTargetRow = (rowOrRows) => fromRow(targetMeta, rowOrRows);

  if (attribute.joinColumn) {
    const { name: joinColumnName, referencedColumn: referencedColumnName } = attribute.joinColumn;

    const referencedValues = _.uniq(
      results.map((r) => r[joinColumnName]).filter((value) => !_.isNil(value))
    );

    if (_.isEmpty(referencedValues)) {
      results.forEach((result) => {
        result[attributeName] = null;
      });

      return;
    }

    const rows = await db.entityManager
      .createQueryBuilder(targetMeta.uid)
      .init(populateValue)
      .addSelect(`${qb.alias}.${referencedColumnName}`)
      .where({ [referencedColumnName]: referencedValues })
      .execute({ mapResults: false });

    const map = _.groupBy(referencedColumnName, rows);

    results.forEach((result) => {
      result[attributeName] = fromTargetRow(_.first(map[result[joinColumnName]]));
    });

    return;
  }

  if (attribute.joinTable) {
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
          result[attributeName] = { count: 0 };
        });
        return;
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
        result[attributeName] = map[result[referencedColumnName]] || { count: 0 };
      });

      return;
    }

    if (_.isEmpty(referencedValues)) {
      results.forEach((result) => {
        result[attributeName] = null;
      });

      return;
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
      result[attributeName] = fromTargetRow(_.first(map[result[referencedColumnName]]));
    });
  }
};

const oneToMany = async (input, ctx) => {
  const { attribute, attributeName, results, populateValue, targetMeta, isCount } = input;
  const { db, qb } = ctx;

  const fromTargetRow = (rowOrRows) => fromRow(targetMeta, rowOrRows);

  if (attribute.joinColumn) {
    const { name: joinColumnName, referencedColumn: referencedColumnName } = attribute.joinColumn;

    const referencedValues = _.uniq(
      results.map((r) => r[joinColumnName]).filter((value) => !_.isNil(value))
    );

    if (_.isEmpty(referencedValues)) {
      results.forEach((result) => {
        result[attributeName] = null;
      });
      return;
    }

    const rows = await db.entityManager
      .createQueryBuilder(targetMeta.uid)
      .init(populateValue)
      .addSelect(`${qb.alias}.${referencedColumnName}`)
      .where({ [referencedColumnName]: referencedValues })
      .execute({ mapResults: false });

    const map = _.groupBy(referencedColumnName, rows);

    results.forEach((result) => {
      result[attributeName] = fromTargetRow(map[result[joinColumnName]] || []);
    });

    return;
  }

  if (attribute.joinTable) {
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
          result[attributeName] = { count: 0 };
        });
        return;
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
        result[attributeName] = map[result[referencedColumnName]] || { count: 0 };
      });

      return;
    }

    if (_.isEmpty(referencedValues)) {
      results.forEach((result) => {
        result[attributeName] = [];
      });
      return;
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
        orderBy: _.mapValues((v) => populateValue.ordering || v, joinTable.orderBy),
      })
      .addSelect(joinColAlias)
      .where({ [joinColAlias]: referencedValues })
      .execute({ mapResults: false });

    const map = _.groupBy(joinColumnName, rows);

    results.forEach((r) => {
      r[attributeName] = fromTargetRow(map[r[referencedColumnName]] || []);
    });
  }
};

const manyToMany = async (input, ctx) => {
  const { attribute, attributeName, results, populateValue, targetMeta, isCount } = input;
  const { db } = ctx;

  const fromTargetRow = (rowOrRows) => fromRow(targetMeta, rowOrRows);

  const { joinTable } = attribute;

  const populateQb = db.entityManager.createQueryBuilder(targetMeta.uid);

  const { name: joinColumnName, referencedColumn: referencedColumnName } = joinTable.joinColumn;

  const alias = populateQb.getAlias();
  const joinColAlias = `${alias}.${joinColumnName}`;
  const referencedValues = _.uniq(
    results.map((r) => r[referencedColumnName]).filter((value) => !_.isNil(value))
  );

  if (isCount) {
    if (_.isEmpty(referencedValues)) {
      results.forEach((result) => {
        result[attributeName] = { count: 0 };
      });
      return;
    }

    const rows = await populateQb
      .init(populateValue)
      .join({
        alias,
        referencedTable: joinTable.name,
        referencedColumn: joinTable.inverseJoinColumn.name,
        rootColumn: joinTable.inverseJoinColumn.referencedColumn,
        rootTable: populateQb.alias,
        on: joinTable.on,
      })
      .select([joinColAlias, populateQb.raw('count(*) AS count')])
      .where({ [joinColAlias]: referencedValues })
      .groupBy(joinColAlias)
      .execute({ mapResults: false });

    const map = rows.reduce((map, row) => {
      map[row[joinColumnName]] = { count: Number(row.count) };
      return map;
    }, {});

    results.forEach((result) => {
      result[attributeName] = map[result[referencedColumnName]] || { count: 0 };
    });

    return;
  }

  if (_.isEmpty(referencedValues)) {
    results.forEach((result) => {
      result[attributeName] = [];
    });
    return;
  }

  const rows = await populateQb
    .init(populateValue)
    .join({
      alias,
      referencedTable: joinTable.name,
      referencedColumn: joinTable.inverseJoinColumn.name,
      rootColumn: joinTable.inverseJoinColumn.referencedColumn,
      rootTable: populateQb.alias,
      on: joinTable.on,
      orderBy: _.mapValues((v) => populateValue.ordering || v, joinTable.orderBy),
    })
    .addSelect(joinColAlias)
    .where({ [joinColAlias]: referencedValues })
    .execute({ mapResults: false });

  const map = _.groupBy(joinColumnName, rows);

  results.forEach((result) => {
    result[attributeName] = fromTargetRow(map[result[referencedColumnName]] || []);
  });
};

const morphX = async (input, ctx) => {
  const { attribute, attributeName, results, populateValue, targetMeta } = input;
  const { db, uid } = ctx;

  const fromTargetRow = (rowOrRows) => fromRow(targetMeta, rowOrRows);

  const { target, morphBy } = attribute;

  const targetAttribute = db.metadata.get(target).attributes[morphBy];

  if (targetAttribute.relation === 'morphToOne') {
    const { idColumn, typeColumn } = targetAttribute.morphColumn;

    const referencedValues = _.uniq(
      results.map((r) => r[idColumn.referencedColumn]).filter((value) => !_.isNil(value))
    );

    if (_.isEmpty(referencedValues)) {
      results.forEach((result) => {
        result[attributeName] = null;
      });

      return;
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

      result[attributeName] = fromTargetRow(matchingValue);
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
        result[attributeName] = attribute.relation === 'morphOne' ? null : [];
      });

      return;
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
          field: attributeName,
        },
        orderBy: _.mapValues((v) => populateValue.ordering || v, joinTable.orderBy),
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

      result[attributeName] = fromTargetRow(matchingValue);
    });
  }
};

const morphToMany = async (input, ctx) => {
  const { attribute, attributeName, results, populateValue } = input;
  const { db } = ctx;

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
      // If the populateValue contains an "on" property,
      // only populate the types defined in it
      ...('on' in populateValue
        ? { [morphColumn.typeColumn.name]: Object.keys(populateValue.on) }
        : {}),
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
  const { on, ...typePopulate } = populateValue;

  for (const type of Object.keys(idsByType)) {
    const ids = idsByType[type];

    // type was removed but still in morph relation
    if (!db.metadata.get(type)) {
      map[type] = {};

      continue;
    }

    const qb = db.entityManager.createQueryBuilder(type);

    const rows = await qb
      .init(on?.[type] ?? typePopulate)
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

    result[attributeName] = matchingRows;
  });
};

const morphToOne = async (input, ctx) => {
  const { attribute, attributeName, results, populateValue } = input;
  const { db } = ctx;

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
  const { on, ...typePopulate } = populateValue;

  for (const type of Object.keys(idsByType)) {
    const ids = idsByType[type];

    // type was removed but still in morph relation
    if (!db.metadata.get(type)) {
      map[type] = {};
      return;
    }

    const qb = db.entityManager.createQueryBuilder(type);

    const rows = await qb
      .init(on?.[type] ?? typePopulate)
      .addSelect(`${qb.alias}.${idColumn.referencedColumn}`)
      .where({ [idColumn.referencedColumn]: ids })
      .execute({ mapResults: false });

    map[type] = _.groupBy(idColumn.referencedColumn, rows);
  }

  results.forEach((result) => {
    const id = result[idColumn.name];
    const type = result[typeColumn.name];

    if (!type || !id) {
      result[attributeName] = null;
      return;
    }

    const matchingRows = map[type][id];

    const fromTargetRow = (rowOrRows) => fromRow(db.metadata.get(type), rowOrRows);

    result[attributeName] = fromTargetRow(_.first(matchingRows));
  });
};

//  TODO: Omit limit & offset to avoid needing a query per result to avoid making too many queries
const pickPopulateParams = (populate) => {
  const fieldsToPick = [
    'select',
    'count',
    'where',
    'populate',
    'orderBy',
    'filters',
    'ordering',
    'on',
  ];

  if (populate.count !== true) {
    fieldsToPick.push('limit', 'offset');
  }

  return _.pick(fieldsToPick, populate);
};

const applyPopulate = async (results, populate, ctx) => {
  const { db, uid, qb } = ctx;
  const meta = db.metadata.get(uid);

  if (_.isEmpty(results)) {
    return results;
  }

  for (const attributeName of Object.keys(populate)) {
    const attribute = meta.attributes[attributeName];
    const targetMeta = db.metadata.get(attribute.target);

    const populateValue = {
      filters: qb.state.filters,
      ...pickPopulateParams(populate[attributeName]),
    };

    const isCount = populateValue.count === true;

    const input = { attribute, attributeName, results, populateValue, targetMeta, isCount };

    switch (attribute.relation) {
      case 'oneToOne':
      case 'manyToOne': {
        await XtoOne(input, ctx);
        break;
      }
      case 'oneToMany': {
        await oneToMany(input, ctx);
        break;
      }
      case 'manyToMany': {
        await manyToMany(input, ctx);
        break;
      }
      case 'morphOne':
      case 'morphMany': {
        await morphX(input, ctx);
        break;
      }
      case 'morphToMany': {
        await morphToMany(input, ctx);
        break;
      }
      case 'morphToOne': {
        await morphToOne(input, ctx);
        break;
      }
      default: {
        break;
      }
    }
  }
};

module.exports = applyPopulate;
