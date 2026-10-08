import { pick } from 'lodash';

// visible fields for the API
const publicFields = ['id', 'displayName', 'category'];

const formatConditions = (conditions: object[]) =>
  Array.from(conditions ?? [], (condition) => pick(condition, publicFields));

export { formatConditions };
