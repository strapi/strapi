import _ from 'lodash/fp';

import { fromRow } from '../transform';
import type { QueryBuilder } from '../../query-builder';
import type { Database } from '../../..';
import type { Meta } from '../../../metadata';
import { ID, RelationalAttribute, Relation } from '../../../types';

// We must select the join column id, however whatever it is named will overwrite an attribute of the same name
// Therefore, we will prefix with something unlikely to conflict with a user attribute
// TODO: ...and completely restrict the strapi_ prefix for an attribute name in the future
const joinColPrefix = '__strapi' as const;

type Context = {
  db: Database;
  qb: QueryBuilder;
  uid: string;
};

type Input<TRelationAttribute extends RelationalAttribute = RelationalAttribute> = {
  attribute: TRelationAttribute;
  attributeName: string;
  results: Row[];
  populateValue: {
    on?: Record<string, Record<string, unknown>>;
  } & Record<string, unknown>;

  isCount: boolean;
};

type InputWithTarget<TRelationAttribute extends RelationalAttribute = RelationalAttribute> =
  Input<TRelationAttribute> & {
    targetMeta: Meta;
  };

type MorphIdMap = Record<string, Record<ID, Row[]>>;

type Row = Record<string, unknown>;

/**
 * Populate oneToOne and manyToOne relation
 * @param {*} input
 * @param {*} ctx
 * @returns
 */
const XtoOne = async (
  input: InputWithTarget<Relation.OneToOne | Relation.ManyToOne>,
  ctx: Context
) => {
  const { attribute, attributeName, results, populateValue, targetMeta, isCount } = input;
  const { db, qb } = ctx;

  const fromTargetRow = (rowOrRows: Row | Row[] | undefined) => fromRow(targetMeta, rowOrRows);

  if ('joinColumn' in attribute && attribute.joinColumn) {
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
      .execute<Row[]>({ mapResults: false });

    const map = _.groupBy<Row[]>(referencedColumnName)(rows);

    results.forEach((result) => {
      result[attributeName] = fromTargetRow(_.first(map[result[joinColumnName] as string]));
    });

    return;
  }

  if ('joinTable' in attribute && attribute.joinTable) {
    const { joinTable } = attribute;

    const qb = db.entityManager.createQueryBuilder(targetMeta.uid);

    const { name: joinColumnName, referencedColumn: referencedColumnName } = joinTable.joinColumn;

    const alias = qb.getAlias();
    const joinColAlias = `${alias}.${joinColumnName}`;
    const joinColRenameAs = `${joinColPrefix}${joinColumnName}`;
    const joinColSelect = `${joinColAlias} as ${joinColRenameAs}`;

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
        .execute<Array<{ count: number } & { [key: string]: string }>>({ mapResults: false });

      const map = rows.reduce(
        (map, row) => {
          map[row[joinColumnName]] = { count: Number(row.count) };
          return map;
        },
        {} as Record<string, { count: number }>
      );

      results.forEach((result) => {
        result[attributeName] = map[result[referencedColumnName] as string] || { count: 0 };
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
      .addSelect(joinColSelect)
      .where({ [joinColAlias]: referencedValues })
      .execute<Row[]>({ mapResults: false });

    const map = _.groupBy<Row>(joinColRenameAs)(rows);

    results.forEach((result) => {
      result[attributeName] = fromTargetRow(_.first(map[result[referencedColumnName] as string]));
    });
  }
};

const oneToMany = async (input: InputWithTarget<Relation.OneToMany>, ctx: Context) => {
  const { attribute, attributeName, results, populateValue, targetMeta, isCount } = input;
  const { db, qb } = ctx;

  const fromTargetRow = (rowOrRows: Row | Row[] | undefined) => fromRow(targetMeta, rowOrRows);

  if ('joinColumn' in attribute && attribute.joinColumn) {
    const {
      name: joinColumnName,
      referencedColumn: referencedColumnName,
      on,
    } = attribute.joinColumn;

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
      .where({
        [referencedColumnName]: referencedValues,
        ...(on && typeof on === 'function' ? on({ populateValue, results }) : {}),
      })
      .execute<Row[]>({ mapResults: false });

    const map = _.groupBy<Row>(referencedColumnName)(rows);

    results.forEach((result) => {
      result[attributeName] = fromTargetRow(map[result[joinColumnName] as string] || []);
    });

    return;
  }

  if ('joinTable' in attribute && attribute.joinTable) {
    const { joinTable } = attribute;

    const qb = db.entityManager.createQueryBuilder(targetMeta.uid);

    const { name: joinColumnName, referencedColumn: referencedColumnName } = joinTable.joinColumn;

    const alias = qb.getAlias();
    const joinColAlias = `${alias}.${joinColumnName}`;
    const joinColRenameAs = `${joinColPrefix}${joinColumnName}`;
    const joinColSelect = `${joinColAlias} as ${joinColRenameAs}`;

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
        .select([joinColSelect, qb.raw('count(*) AS count')])
        .where({ [joinColAlias]: referencedValues })
        .groupBy(joinColAlias)
        .execute<Array<{ count: number } & { [key: string]: string }>>({ mapResults: false });

      const map = rows.reduce(
        (map, row) => {
          map[row[joinColRenameAs]] = { count: Number(row.count) };
          return map;
        },
        {} as Record<string, { count: number }>
      );

      results.forEach((result) => {
        result[attributeName] = map[result[referencedColumnName] as string] || { count: 0 };
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
      .addSelect(joinColSelect)
      .where({ [joinColAlias]: referencedValues })
      .execute<Row[]>({ mapResults: false });

    const map = _.groupBy<Row>(joinColRenameAs)(rows);

    results.forEach((r) => {
      r[attributeName] = fromTargetRow(map[r[referencedColumnName] as string] || []);
    });
  }
};

const manyToMany = async (input: InputWithTarget<Relation.ManyToMany>, ctx: Context) => {
  const { attribute, attributeName, results, populateValue, targetMeta, isCount } = input;
  const { db } = ctx;

  const fromTargetRow = (rowOrRows: Row | Row[] | undefined) => fromRow(targetMeta, rowOrRows);

  const { joinTable } = attribute;

  const populateQb = db.entityManager.createQueryBuilder(targetMeta.uid);

  const { name: joinColumnName, referencedColumn: referencedColumnName } = joinTable.joinColumn;

  const alias = populateQb.getAlias();
  const joinColAlias = `${alias}.${joinColumnName}`;
  const joinColRenameAs = `${joinColPrefix}${joinColumnName}`;
  const joinColSelect = `${joinColAlias} as ${joinColRenameAs}`;

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
      .execute<Array<{ count: number } & { [key: string]: string }>>({ mapResults: false });

    const map = rows.reduce(
      (map, row) => {
        map[row[joinColumnName]] = { count: Number(row.count) };
        return map;
      },
      {} as Record<string, { count: number }>
    );

    results.forEach((result) => {
      result[attributeName] = map[result[referencedColumnName] as string] || { count: 0 };
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
    .addSelect(joinColSelect)
    .where({ [joinColAlias]: referencedValues })
    .execute<Row[]>({ mapResults: false });

  const map = _.groupBy<Row>(joinColRenameAs)(rows);

  results.forEach((result) => {
    result[attributeName] = fromTargetRow(map[result[referencedColumnName] as string] || []);
  });
};

const morphX = async (
  input: InputWithTarget<Relation.MorphMany | Relation.MorphOne>,
  ctx: Context
) => {
  const { attribute, attributeName, results, populateValue, targetMeta } = input;
  const { db, uid } = ctx;

  const fromTargetRow = (rowOrRows: Row | Row[] | undefined) => fromRow(targetMeta, rowOrRows);

  const { target, morphBy } = attribute;

  const targetAttribute = db.metadata.get(target).attributes[morphBy];

  if (targetAttribute.type === 'relation' && targetAttribute.relation === 'morphToOne') {
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
      .execute<Row>({ mapResults: false });

    const map = _.groupBy<Row>(idColumn.name)(rows);

    results.forEach((result) => {
      const matchingRows = map[result[idColumn.referencedColumn] as string];

      const matchingValue =
        attribute.relation === 'morphOne' ? _.first(matchingRows) : matchingRows;

      result[attributeName] = fromTargetRow(matchingValue);
    });
  } else if (targetAttribute.type === 'relation' && targetAttribute.relation === 'morphToMany') {
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
      .execute<Row[]>({ mapResults: false });

    const map = _.groupBy<Row>(idColumn.name)(rows);

    results.forEach((result) => {
      const matchingRows = map[result[idColumn.referencedColumn] as string];

      const matchingValue =
        attribute.relation === 'morphOne' ? _.first(matchingRows) : matchingRows;

      result[attributeName] = fromTargetRow(matchingValue);
    });
  }
};

const morphToMany = async (input: Input<Relation.MorphToMany>, ctx: Context) => {
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
        ? { [morphColumn.typeColumn.name]: Object.keys(populateValue.on ?? {}) }
        : {}),
    })
    .orderBy([joinColumn.name, 'order'])
    .execute<Row[]>({ mapResults: false });

  const joinMap = _.groupBy(joinColumn.name, joinRows);

  const idsByType = joinRows.reduce<Record<string, ID[]>>((acc, result) => {
    const idValue = result[morphColumn.idColumn.name] as ID;
    const typeValue = result[morphColumn.typeColumn.name] as string;

    if (!idValue || !typeValue) {
      return acc;
    }

    if (!_.has(typeValue, acc)) {
      acc[typeValue] = [];
    }

    acc[typeValue].push(idValue);

    return acc;
  }, {});

  const map: MorphIdMap = {};
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
      .execute<Row[]>({ mapResults: false });

    map[type] = _.groupBy<Row>(idColumn.referencedColumn)(rows);
  }

  results.forEach((result) => {
    const joinResults = joinMap[result[joinColumn.referencedColumn] as string] || [];

    const matchingRows = joinResults.flatMap((joinResult) => {
      const id = joinResult[idColumn.name] as ID;
      const type = joinResult[typeColumn.name] as string;

      const targetMeta = db.metadata.get(type);

      const fromTargetRow = (rowOrRows: Row | Row[] | undefined) => fromRow(targetMeta, rowOrRows);

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

const morphToOne = async (input: Input<Relation.MorphToOne>, ctx: Context) => {
  const { attribute, attributeName, results, populateValue } = input;
  const { db } = ctx;

  const { morphColumn } = attribute;
  const { idColumn, typeColumn } = morphColumn;

  // make a map for each type what ids to return
  // make a nested map per id

  const idsByType = results.reduce<Record<string, ID[]>>((acc, result) => {
    const idValue = result[morphColumn.idColumn.name] as ID;
    const typeValue = result[morphColumn.typeColumn.name] as string;

    if (!idValue || !typeValue) {
      return acc;
    }

    if (!(typeValue in acc)) {
      acc[typeValue] = [];
    }

    acc[typeValue].push(idValue);

    return acc;
  }, {});

  const map: MorphIdMap = {};
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
      .execute<Row[]>({ mapResults: false });

    map[type] = _.groupBy<Row>(idColumn.referencedColumn)(rows);
  }

  results.forEach((result) => {
    const id = result[idColumn.name] as ID;
    const type = result[typeColumn.name] as string;

    if (!type || !id) {
      result[attributeName] = null;
      return;
    }

    const matchingRows = map[type][id];

    const fromTargetRow = (rowOrRows: Row | Row[] | undefined) =>
      fromRow(db.metadata.get(type), rowOrRows);

    result[attributeName] = fromTargetRow(_.first(matchingRows));
  });
};

//  TODO: Omit limit & offset to avoid needing a query per result to avoid making too many queries
const pickPopulateParams = (populate: Record<string, unknown>) => {
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

const getPopulateValue = (populate: Record<string, any>, filters: Record<string, any>) => {
  const populateValue = {
    filters,
    ...pickPopulateParams(populate),
  };

  if ('on' in populateValue) {
    populateValue.on = _.mapValues(
      (value) => {
        if (_.isPlainObject(value)) {
          value.filters = filters;
        }

        return value;
      },
      populateValue.on as Record<string, any>
    );
  }

  return populateValue;
};

const applyPopulate = async (results: Row[], populate: Record<string, any>, ctx: Context) => {
  const { db, uid, qb } = ctx;
  const meta = db.metadata.get(uid);

  if (_.isEmpty(results)) {
    return results;
  }

  for (const attributeName of Object.keys(populate)) {
    const attribute = meta.attributes[attributeName];

    if (attribute.type !== 'relation') {
      throw new Error(`Invalid populate attribute ${attributeName}`);
    }

    const populateValue = getPopulateValue(populate[attributeName], qb.state.filters);

    const isCount = 'count' in populateValue && populateValue.count === true;

    switch (attribute.relation) {
      case 'oneToOne':
      case 'manyToOne': {
        const targetMeta = db.metadata.get(attribute.target);
        const input = { attribute, attributeName, results, populateValue, targetMeta, isCount };
        await XtoOne(input, ctx);
        break;
      }
      case 'oneToMany': {
        const targetMeta = db.metadata.get(attribute.target);
        const input = { attribute, attributeName, results, populateValue, targetMeta, isCount };
        await oneToMany(input, ctx);
        break;
      }
      case 'manyToMany': {
        const targetMeta = db.metadata.get(attribute.target);
        const input = { attribute, attributeName, results, populateValue, targetMeta, isCount };
        await manyToMany(input, ctx);
        break;
      }
      case 'morphOne':
      case 'morphMany': {
        const targetMeta = db.metadata.get(attribute.target);
        const input = { attribute, attributeName, results, populateValue, targetMeta, isCount };
        await morphX(input, ctx);
        break;
      }
      case 'morphToMany': {
        const input = { attribute, attributeName, results, populateValue, isCount };
        await morphToMany(input, ctx);
        break;
      }
      case 'morphToOne': {
        const input = { attribute, attributeName, results, populateValue, isCount };
        await morphToOne(input, ctx);
        break;
      }
      default: {
        break;
      }
    }
  }
};

export default applyPopulate;
