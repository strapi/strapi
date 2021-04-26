import { stringify, parse } from 'qs';
import get from 'lodash/get';
import isObject from 'lodash/isObject';

/**
 * Updates the leafs of the first argument
 * @param {object} initialParams
 * @param {object} params
 * @returns string
 */
const mergeParams = (initialParams, params) => {
  return Object.keys(initialParams).reduce((acc, current) => {
    const intialValue = initialParams[current];
    const nextValue = get(params, [current], intialValue);

    if (isObject(intialValue)) {
      return { ...acc, [current]: mergeParams(intialValue, nextValue) };
    }

    acc[current] = nextValue;

    return acc;
  }, {});
};

const getDeleteRedirectionLink = (links, slug, rawQuery) => {
  const matchingLink = links.find(({ destination }) => destination.includes(slug));

  if (!matchingLink) {
    return '/';
  }

  const { destination, search } = matchingLink;
  const searchQueryParams = parse(search);
  const currentQueryParams = parse(rawQuery.substring(1));

  const mergedParams = mergeParams(searchQueryParams, currentQueryParams);

  const link = `${destination}?${stringify(mergedParams, { encode: false })}`;

  return link;
};

export default getDeleteRedirectionLink;
export { mergeParams };
