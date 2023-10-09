import _ from 'lodash/fp';

import * as types from '../../utils/types';
import { createField } from '../../fields';

import type { Meta } from '../../metadata';

type Row = Record<string, unknown> | null;
export type Rec = Record<string, unknown> | null;

const fromSingleRow = (meta: Meta, row: Row): Rec => {
  const { attributes } = meta;

  if (_.isNil(row)) {
    return null;
  }

  const obj: Rec = {};

  for (const column in row) {
    if (!_.has(column, meta.columnToAttribute)) {
      continue;
    }

    const attributeName = meta.columnToAttribute[column];
    const attribute = attributes[attributeName];

    if (types.isScalar(attribute.type)) {
      const field = createField(attribute);

      const val = row[column] === null ? null : field.fromDB(row[column]);

      obj[attributeName] = val;
    }

    if (types.isRelation(attribute.type)) {
      obj[attributeName] = row[column];
    }
  }

  return obj;
};

const fromRow = (meta: Meta, row: Row | Row[] | undefined) => {
  if (_.isNil(row)) {
    return null;
  }

  if (Array.isArray(row)) {
    return row.map((singleRow) => fromSingleRow(meta, singleRow));
  }

  return fromSingleRow(meta, row);
};

const toSingleRow = (meta: Meta, data: Rec = {}): Row => {
  if (_.isNil(data)) {
    return data;
  }

  const { attributes } = meta;

  for (const key of Object.keys(data)) {
    const attribute = attributes[key];

    if (
      !attribute ||
      !('columnName' in attribute) ||
      !attribute.columnName ||
      attribute.columnName === key
    ) {
      continue;
    }

    data[attribute.columnName] = data[key];
    delete data[key];
  }

  return data;
};

function toRow<TData extends Rec | Rec[] | null>(
  meta: Meta,
  data: TData
): TData extends null ? null : TData extends Rec[] ? Row[] : Rec;
function toRow(meta: Meta, data: Rec | Rec[] | null): Row | Row[] | null {
  if (_.isNil(data)) {
    return data;
  }

  if (_.isArray(data)) {
    return data.map((datum) => toSingleRow(meta, datum));
  }

  return toSingleRow(meta, data);
}

const toColumnName = (meta: Meta, name: null | string) => {
  if (!name) {
    throw new Error('Name cannot be null');
  }

  const attribute = meta.attributes[name];

  if (!attribute) {
    return name;
  }

  return ('columnName' in attribute && attribute.columnName) || name;
};

export { toRow, fromRow, toColumnName };
