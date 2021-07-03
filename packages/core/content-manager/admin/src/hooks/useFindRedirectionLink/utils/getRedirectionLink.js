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

const getRedirectionLink = (links, slug, rawQuery) => {
  const matchingLink = links.find(({ to }) => to.includes(slug));

  if (!matchingLink) {
    return '/';
  }

  const { to, search } = matchingLink;
  const searchQueryParams = parse(search);
  const currentQueryParams = parse(rawQuery.substring(1));

  const mergedParams = mergeParams(searchQueryParams, currentQueryParams);

  const link = `${to}?${stringify(mergedParams, { encode: false })}`;

  return link;
};

export default getRedirectionLink;
export { mergeParams };
