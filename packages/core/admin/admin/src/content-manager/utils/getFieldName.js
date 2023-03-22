import isNaN from 'lodash/isNaN';

const getFieldName = (stringName) =>
  stringName.split('.').filter((string) => isNaN(parseInt(string, 10)));

export default getFieldName;
