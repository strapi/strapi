import get from 'lodash/get';

import type { Internal } from '@strapi/types';

const getType = (schema: Internal.Struct.Schema, attrName: string) =>
  get(schema, ['attributes', attrName, 'type'], '');
const getOtherInfos = (schema: Internal.Struct.Schema, arr: string[]) =>
  get(schema, ['attributes', ...arr], '');

export { getOtherInfos, getType };
