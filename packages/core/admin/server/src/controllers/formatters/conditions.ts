import fp from 'lodash/fp.js';

const { pick, map } = fp;
// visible fields for the API
const publicFields = ['id', 'displayName', 'category'];

const formatConditions = map(pick(publicFields));

export { formatConditions };
