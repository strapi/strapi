import get from 'lodash/get';

import type { Struct } from '@strapi/types';

const getType = (schema: Struct.Schema, attrName: string) =>
  get(schema, ['attributes', attrName, 'type'], '');
const getOtherInfos = (schema: Struct.Schema, arr: string[]) =>
  get(schema, ['attributes', ...arr], '');

export { getOtherInfos, getType };
