import isNaN from 'lodash/isNaN';

const getFieldName = (stringName: string) =>
  stringName.split('.').filter((string) => isNaN(parseInt(string, 10)));

const getMaxTempKey = (arr: Array<{ __temp_key__?: number }>) => {
  if (arr.length === 0) {
    return -1;
  }

  const maxTempKey = Math.max(...arr.map((o) => o.__temp_key__ ?? 0));

  return Number.isNaN(maxTempKey) ? -1 : maxTempKey;
};

const isFieldTypeNumber = (type: string) => {
  return ['integer', 'biginteger', 'decimal', 'float', 'number'].includes(type);
};

export { getFieldName, getMaxTempKey, isFieldTypeNumber };
