import { omitBy } from 'lodash';

const compactParams = params =>
  omitBy(
    params,
    param =>
      (typeof param === 'string' && param === '') ||
      (Array.isArray(param) && param.length === 0) ||
      param === null ||
      param === undefined
  );

export default compactParams;
