import get from 'lodash/get';

const getType = (schema, attrName) => get(schema, ['attributes', attrName, 'type'], '');
const getOtherInfos = (schema, arr) => get(schema, ['attributes', ...arr], '');

export { getType, getOtherInfos };
