import get from 'lodash/get';

const getType = <T extends object>(schema: T, attrName: string) =>
  get(schema, ['attributes', attrName, 'type'], '');
const getOtherInfos = <T extends object>(schema: T, arr: string[]) =>
  get(schema, ['attributes', ...arr], '');

export { getOtherInfos, getType };
