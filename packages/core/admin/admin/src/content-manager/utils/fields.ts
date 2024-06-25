import isNaN from 'lodash/isNaN';

const getFieldName = (stringName: string) =>
  stringName.split('.').filter((string) => isNaN(parseInt(string, 10)));

const getMaxTempKey = (arr: Array<{ __temp_key__?: number; id?: number }>) => {
  if (arr.length === 0) {
    return -1;
  }

  const maxValue = Math.max(...arr.map((o) => Number(o.id ?? o.__temp_key__ ?? 0)));

  return Number.isNaN(maxValue) ? -1 : maxValue;
};

const isFieldTypeNumber = (type: string) => {
  return ['integer', 'biginteger', 'decimal', 'float', 'number'].includes(type);
};

export { getFieldName, getMaxTempKey, isFieldTypeNumber };
