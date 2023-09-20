import _ from 'lodash/fp';

import * as types from '../../utils/types';
import { createJoin } from './join';
import { toColumnName } from './transform';

import type { Ctx } from '../types';

type OrderByCtx = Ctx & { alias?: string };
type OrderBy = string | { [key: string]: 'asc' | 'desc' } | OrderBy[];
type OrderByValue = { column: unknown; order?: 'asc' | 'desc' };

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
