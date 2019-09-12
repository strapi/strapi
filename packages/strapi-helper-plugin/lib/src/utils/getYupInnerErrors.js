import { get } from 'lodash';

const getYupInnerErrors = errorObject =>
  get(errorObject, 'inner', []).reduce((acc, current) => {
    const key = current.path
      .split('[')
      .join('.')
      .split(']')
      .join('');

    acc[key] = [{ id: current.message }];

    return acc;
  }, {});

export default getYupInnerErrors;
