import { map, pick } from 'lodash';

// visible fields for the API
const publicFields = ['id', 'displayName', 'category'];

const formatConditions = (conditions: object[]) =>
  map(conditions, (condition) => pick(condition, publicFields));

export { formatConditions };
