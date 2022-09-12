import { get } from 'lodash';

const getYupInnerErrors = (error) => {
  return get(error, 'inner', []).reduce((acc, curr) => {
    acc[curr.path.split('[').join('.').split(']').join('')] = {
      id: curr.message,
      defaultMessage: curr.message,
    };

    return acc;
  }, {});
};

export default getYupInnerErrors;
