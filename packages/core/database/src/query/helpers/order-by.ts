import _ from 'lodash/fp';
import knex from 'knex';

import * as types from '../../utils/types';
import { createJoin } from './join';
import { toColumnName } from './transform';

import type { Ctx } from '../types';

type OrderByCtx = Ctx & { alias?: string };
type OrderBy = string | { [key: string]: 'asc' | 'desc' } | OrderBy[];
type OrderByValue = { column: string; order?: 'asc' | 'desc' };

export const processOrderBy = (orderBy: OrderBy, ctx: OrderByCtx): OrderByValue[] => {
  const { db, uid, qb, alias } = ctx;
  const meta = db.metadata.get(uid);
  const { attributes } = meta;

  if (typeof orderBy === 'string') {
    const attribute = attributes[orderBy];

    if (!attribute) {
      throw new Error(`Attribute ${orderBy} not found on model ${uid}`);
    }

    const columnName = toColumnName(meta, orderBy);

    return [{ column: qb.aliasColumn(columnName, alias) }];
  }

  if (Array.isArray(orderBy)) {
    return orderBy.flatMap((value) => processOrderBy(value, ctx));
  }

  if (_.isPlainObject(orderBy)) {
    return Object.entries(orderBy).flatMap(([key, direction]) => {
      const value = orderBy[key];
      const attribute = attributes[key];

      if (!attribute) {
        throw new Error(`Attribute ${key} not found on model ${uid}`);
      }

      if (types.isScalar(attribute.type)) {
        const columnName = toColumnName(meta, key);

        return { column: qb.aliasColumn(columnName, alias), order: direction };
      }

      if (attribute.type === 'relation' && 'target' in attribute) {
        const subAlias = createJoin(ctx, {
          alias: alias || qb.alias,
          attributeName: key,
          attribute,
        });

        return processOrderBy(value, {
          db,
          qb,
          alias: subAlias,
          uid: attribute.target,
        });
      }

      throw new Error(`You cannot order on ${attribute.type} types`);
    });
  }

  throw new Error('Invalid orderBy syntax');
};

export const getStrapiOrderColumnAlias = (column: string) => {
  const prefix = '__strapi_order_by';
  const trimmedColumnName = column.replaceAll('.', '_');

  return `${prefix}__${trimmedColumnName}`;
};

// Here we assume that all necessary joins are done in the original query (originalQuery), and every needed column is available with the right name.
export const wrapWithDeepSort = (originalQuery: knex.Knex.QueryBuilder, ctx: OrderByCtx) => {
  const { db, qb, uid } = ctx;
  /**
   * Notes:
   * - pagination (offset, limit, first) has to be done in the final query (the one wrapping the others), otherwise, some rows might go missing
   * - filtering (where/search, ) has to be done in the deepest sub query possible to avoid processing invalid rows and corrupting the final results
   * - todo (sort): what about groupBy? Is it compatible or not?
   * - todo (sort): what about transactions (and other statements like forUpdate, onConflict, increments and decrements)?
   * - <> should we clone the existing query or re-create a brand new one by copying the joins + where/search
   *
   * Flow: R (filtered unsorted data) -> T (partitioned/sorted data) --> Q (distinct, paginated, sorted data)
   */

  const { tableName } = db.metadata.get(uid);

  const orderBy = _.cloneDeep<OrderByValue[]>(qb.state.orderBy);

  // 0. Init a new Knex query instance (referenced as Q) using the DB connection
  const qAlias = qb.getAlias();
  const aliasedTableName = qb.mustUseAlias() ? alias(qAlias, tableName) : tableName;

  const Q = db.getConnection(aliasedTableName);

  // 1. Transform the original query into a sub-query (referenced as R)
  const R = originalQuery.clone();
  const rAlias = qb.getAlias();

  // Clear unwanted statements from the initial query clone
  // Note: `first()` is cleared through the combination of `R.clear('limit')` and calling `R.select(...)` again
  R.clear('select')
    // Those statements will be re-applied when duplicates are removed from the final selection
    .clear('order')
    .clear('limit')
    .clear('offset');

  // Make sure we're only selecting needed fields from the sub query
  R.select(
    // Always select the row id for future manipulation
    prefix(qb.alias, 'id'),
    // Select every column used in an order by clause, but alias it for future reference
    // i.e. if t2.name is present in an order by clause:
    // Then, "t2.name" will become "t2.name as __strapi_order_by__t2_name"
    ...orderBy.map((o) => alias(getStrapiOrderColumnAlias(o.column), o.column))
  );

  // 2. Create a sub-query to extract the partitions/metadata
  const tAlias = qb.getAlias();

  const selectRowsAsNumberedPartitions = (T: knex.Knex.QueryBuilder) => {
    const tOrderBy = orderBy
      // Transform order by clause to their alias
      .map((o) => ({
        column: prefix(rAlias, getStrapiOrderColumnAlias(o.column)),
        order: o.order,
      }));

    const tOrderBySelect = tOrderBy.map<string>(_.prop('column'));

    T.select(prefix(rAlias, 'id'), ...tOrderBySelect)
      // The row number is used to assign an index to every row from every partition
      .rowNumber('__strapi_row_number', function () {
        // TODO: Try without the this
        // Apply every order by
        for (const orderBy of tOrderBy) {
          this.orderBy(orderBy.column, orderBy.order, 'last');
        }

        // Partition using the original ID
        this.partitionBy(`${rAlias}.id`);
      })
      .from(R.as(rAlias))
      .as(tAlias);
  };

  // 3. From Q, select the wanted data, then sort it using T
  // todo (sort): make the select here work
  const originalSelect = _.difference(
    // Remove order by columns from the final select
    qb.state.select,
    qb.state.orderBy.map(_.prop('column'))
  ).map(prefix(qAlias));

  // Since "where" and "search" are applied at the sub-query level (before partitioning)
  Q.select(originalSelect)
    // Note: Since we're applying the "where" statement directly on R (and not on Q), we're using
    // an inner join instead of a left one
    // This is because we want to exclude Q rows that weren't returned by R then T
    .innerJoin(selectRowsAsNumberedPartitions, function () {
      this
        // Only select rows that are returned by T
        .on(`${tAlias}.id`, `${qAlias}.id`)
        // By only selecting the rows number equal to 1, we make sure we don't have duplicate, and that
        // we're selecting rows in the correct order amongst the groups created by the "partition by"
        .andOnVal(`${tAlias}.__strapi_row_number`, '=', 1);
    });

  // Re-apply the pagination params
  // todo (sort): Extract this to a dedicated method

  if (qb.state.limit) {
    Q.limit(qb.state.limit);
  }

  if (qb.state.offset) {
    Q.offset(qb.state.offset);
  }

  if (qb.state.first) {
    Q.first();
  }

  // Re-apply the sort thanks to T values
  Q.orderBy([
    // Transform "order by" clause to their T alias and prefix them with T alias
    ...orderBy.map((o) => ({
      column: prefix(tAlias, getStrapiOrderColumnAlias(o.column)),
      order: o.order,
    })),
    // Add T.id to the order by clause to get consistent results in case several rows have the exact same order
    { column: `${tAlias}.id`, order: 'asc' },
  ]);

  return Q;
};

// Utils
const alias = _.curry((alias: string, value: string) => `${value} as ${alias}`);
const prefix = _.curry((prefix: string, value: string) => `${prefix}.${value}`);
