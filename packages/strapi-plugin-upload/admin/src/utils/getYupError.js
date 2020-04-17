import { get } from 'lodash';

const getYupError = error => {
  return get(error, 'inner', []).reduce((acc, curr) => {
    acc[
      curr.path
        .split('[')
        .join('.')
        .split(']')
        .join('')
    ] = { id: curr.message, number: curr.params.wrongURLsNumber };

    return acc;
  }, {});
};

export default getYupError;
