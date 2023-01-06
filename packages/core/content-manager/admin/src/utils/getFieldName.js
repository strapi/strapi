import { isNaN } from 'lodash';

const getFieldName = (stringName) =>
  stringName.split('.').filter((string) => isNaN(parseInt(string, 10)));

export default getFieldName;
