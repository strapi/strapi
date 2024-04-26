import type { UID } from '@strapi/types';

import { curry, assoc } from 'lodash/fp';

const transformParamsToQuery = curry((uid: UID.Schema, params: any) => {
  const query = strapi.get('query-params').transform(uid, params);

  return assoc('where', { ...params?.lookup, ...query.where }, query);
});

export { transformParamsToQuery };
