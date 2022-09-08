'use strict';

const createPivotJoin = (ctx, { alias, refAlias, joinTable, targetMeta }) => {
  const { qb } = ctx;
  const joinAlias = qb.getAlias();
  qb.join({
    alias: joinAlias,
    referencedTable: joinTable.name,
    referencedColumn: joinTable.joinColumn.name,
    rootColumn: joinTable.joinColumn.referencedColumn,
    rootTable: alias,
    on: joinTable.on,
  });

  const subAlias = refAlias || qb.getAlias();
  qb.join({
    alias: subAlias,
    referencedTable: targetMeta.tableName,
    referencedColumn: joinTable.inverseJoinColumn.referencedColumn,
    rootColumn: joinTable.inverseJoinColumn.name,
    rootTable: joinAlias,
  });

  return subAlias;
};

const createJoin = (ctx, { alias, refAlias, attributeName, attribute }) => {
  const { db, qb } = ctx;

  if (attribute.type !== 'relation') {
    throw new Error(`Cannot join on non relational field ${attributeName}`);
  }

  const targetMeta = db.metadata.get(attribute.target);

  const { joinColumn } = attribute;

  if (joinColumn) {
    const subAlias = refAlias || qb.getAlias();
    qb.join({
      alias: subAlias,
      referencedTable: targetMeta.tableName,
      referencedColumn: joinColumn.referencedColumn,
      rootColumn: joinColumn.name,
      rootTable: alias,
    });
    return subAlias;
  }

  const { joinTable } = attribute;
  if (joinTable) {
    return createPivotJoin(ctx, { alias, refAlias, joinTable, targetMeta });
  }

  return alias;
};

// TODO: toColumnName for orderBy & on
const applyJoin = (qb, join) => {
  const {
    method = 'leftJoin',
    alias,
    referencedTable,
    referencedColumn,
    rootColumn,
    rootTable = qb.alias,
    on,
    orderBy,
  } = join;

  qb[method](`${referencedTable} as ${alias}`, (inner) => {
    inner.on(`${rootTable}.${rootColumn}`, `${alias}.${referencedColumn}`);

    if (on) {
      for (const key of Object.keys(on)) {
        inner.onVal(`${alias}.${key}`, on[key]);
      }
    }
  });

  if (orderBy) {
    Object.keys(orderBy).forEach((column) => {
      const direction = orderBy[column];
      qb.orderBy(`${alias}.${column}`, direction);
    });
  }
};

const applyJoins = (qb, joins) => joins.forEach((join) => applyJoin(qb, join));

module.exports = {
  createJoin,
  createPivotJoin,
  applyJoins,
  applyJoin,
};
