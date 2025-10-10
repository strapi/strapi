import _ from 'lodash/fp';
import knex from 'knex';

import * as types from '../../utils/types';
import { createJoin } from './join';
import { toColumnName } from './transform';

import type { Ctx } from '../types';

type OrderByCtx = Ctx & { alias?: string };
type OrderBy = string | { [key: string]: 'asc' | 'desc' } | OrderBy[];
type OrderByValue = { column: string; order?: 'asc' | 'desc' };

const COL_STRAPI_ROW_NUMBER = '__strapi_row_number';
const COL_STRAPI_ORDER_BY_PREFIX = '__strapi_order_by';

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
  const trimmedColumnName = column.replaceAll('.', '_');

  return `${COL_STRAPI_ORDER_BY_PREFIX}__${trimmedColumnName}`;
};

/**
 * Wraps the original Knex query with deep sorting functionality.
 *
 * The function takes an original query and an OrderByCtx object as parameters and returns a new Knex query with deep sorting applied.
 */
export const wrapWithDeepSort = (originalQuery: knex.Knex.QueryBuilder, ctx: OrderByCtx) => {
  /**
   * Notes:
   * - The generated query has the following flow: baseQuery (filtered unsorted data) -> T (partitioned/sorted data) --> resultQuery (distinct, paginated, sorted data)
   * - Pagination and selection are transferred from the original query to the outer one to avoid pruning rows too early
   * - Filtering (where) has to be done in the deepest sub query possible to avoid processing invalid rows and corrupting the final results
   * - We assume that all necessary joins are done in the original query (`originalQuery`), and every needed column is available with the right name and alias.
   */

  const { db, qb, uid } = ctx;

  const { tableName } = db.metadata.get(uid);

  // The orderBy is cloned to avoid unwanted mutations of the original object
  const orderBy = _.cloneDeep<OrderByValue[]>(qb.state.orderBy);

  // 0. Init a new Knex query instance (referenced as resultQuery) using the DB connection
  //    The connection reuse the original table name (aliased if needed)
  const resultQueryAlias = qb.getAlias();
  const aliasedTableName = qb.mustUseAlias() ? alias(resultQueryAlias, tableName) : tableName;

  const resultQuery = db.getConnection(aliasedTableName);

  // 1. Clone the original query to create the sub-query (referenced as baseQuery) and avoid any mutation on the initial object
  const baseQuery = originalQuery.clone();
  const baseQueryAlias = qb.getAlias();

  // Clear unwanted statements from the sub-query 'baseQuery'
  // Note: `first()` is cleared through the combination of `baseQuery.clear('limit')` and calling `baseQuery.select(...)` again
  // Note: Those statements will be re-applied when duplicates are removed from the final selection
  baseQuery
    // Columns selection
    .clear('select')
    // Pagination and sorting
    .clear('order')
    .clear('limit')
    .clear('offset');

  // Override the initial select and return only the columns needed for the partitioning.
  baseQuery.select(
    // Always select the row id for future manipulation
    prefix(qb.alias, 'id'),
    // Select every column used in an order by clause, but alias it for future reference
    // i.e. if t2.name is present in an order by clause:
    //      Then, "t2.name" will become "t2.name as __strapi_order_by__t2_name"
    ...orderBy.map((orderByClause) =>
      alias(getStrapiOrderColumnAlias(orderByClause.column), orderByClause.column)
    )
  );

  // 2. Create a sub-query callback to extract and sort the partitions using row number
  const partitionedQueryAlias = qb.getAlias();

  const selectRowsAsNumberedPartitions = (partitionedQuery: knex.Knex.QueryBuilder) => {
    // Transform order by clause to their alias to reference them from baseQuery
    const prefixedOrderBy = orderBy.map((orderByClause) => ({
      column: prefix(baseQueryAlias, getStrapiOrderColumnAlias(orderByClause.column)),
      order: orderByClause.order,
    }));

    // partitionedQuery select must contain every column used for sorting
    const orderByColumns = prefixedOrderBy.map<string>(_.prop('column'));

    partitionedQuery
      .select(
        // Always select baseQuery.id
        prefix(baseQueryAlias, 'id'),
        // Sort columns
        ...orderByColumns
      )
      // The row number is used to assign an index to every row in every partition
      .rowNumber(COL_STRAPI_ROW_NUMBER, (subQuery) => {
        for (const orderByClause of prefixedOrderBy) {
          subQuery.orderBy(orderByClause.column, orderByClause.order, 'last');
        }

        // And each partition/group is created based on baseQuery.id
        subQuery.partitionBy(`${baseQueryAlias}.id`);
      })
      .from(baseQuery.as(baseQueryAlias))
      .as(partitionedQueryAlias);
  };

  // 3. Create the final resultQuery query, that select and sort the wanted data using T

  const originalSelect = _.difference(
    qb.state.select,
    // Remove order by columns from the initial select
    qb.state.orderBy.map(_.prop('column'))
  )
    // Alias everything in resultQuery
    .map(prefix(resultQueryAlias));

  resultQuery
    .select(originalSelect)
    // Join T to resultQuery to access sorted data
    // Notes:
    // - Only select the first row for each partition
    // - Since we're applying the "where" statement directly on baseQuery (and not on resultQuery), we're using an inner join to avoid unwanted rows
    .innerJoin(selectRowsAsNumberedPartitions, function () {
      this
        // Only select rows that are returned by T
        .on(`${partitionedQueryAlias}.id`, `${resultQueryAlias}.id`)
        // By only selecting the rows number equal to 1, we make sure we don't have duplicate, and that
        // we're selecting rows in the correct order amongst the groups created by the "partition by"
        .andOnVal(`${partitionedQueryAlias}.${COL_STRAPI_ROW_NUMBER}`, '=', 1);
    });

  // Re-apply pagination params

  if (qb.state.limit) {
    resultQuery.limit(qb.state.limit);
  }

  if (qb.state.offset) {
    resultQuery.offset(qb.state.offset);
  }

  if (qb.state.first) {
    resultQuery.first();
  }

  // Re-apply the sort using T values
  resultQuery.orderBy([
    // Transform "order by" clause to their T alias and prefix them with T alias
    ...orderBy.map((orderByClause) => ({
      column: prefix(partitionedQueryAlias, getStrapiOrderColumnAlias(orderByClause.column)),
      order: orderByClause.order,
    })),
    // Add T.id to the order by clause to get consistent results in case several rows have the exact same order
    { column: `${partitionedQueryAlias}.id`, order: 'asc' },
  ]);

  return resultQuery;
};

// Utils
const alias = _.curry((alias: string, value: string) => `${value} as ${alias}`);
const prefix = _.curry((prefix: string, value: string) => `${prefix}.${value}`);
