import { pick } from 'lodash/fp';

// visible fields for the API
const publicFields = ['id', 'displayName', 'category'];

const formatConditions = (conditions: unknown[]) =>
  conditions.map((condition) => pick(publicFields, condition));

export { formatConditions };
