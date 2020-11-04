import { sortBy } from 'lodash';
import { checkIfAttributeIsDisplayable } from '../../../utils';

const getAllAllowedHeaders = attributes => {
  const allowedAttributes = Object.keys(attributes).reduce((acc, current) => {
    const attribute = attributes[current];

    if (checkIfAttributeIsDisplayable(attribute)) {
      acc.push(current);
    }

    return acc;
  }, []);

  return sortBy(allowedAttributes, ['name']);
};

export default getAllAllowedHeaders;
