import get from 'lodash/get';

import type { Schema } from '@strapi/types';

const getType = (schema: Schema.Schema, attrName: string) =>
  get(schema, ['attributes', attrName, 'type'], '');
const getOtherInfos = (schema: Schema.Schema, arr: string[]) =>
  get(schema, ['attributes', ...arr], '');

export { getOtherInfos, getType };
