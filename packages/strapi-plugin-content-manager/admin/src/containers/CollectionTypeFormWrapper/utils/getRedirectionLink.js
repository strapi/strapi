import { stringify, parse } from 'qs';
import get from 'lodash/get';
import isObject from 'lodash/isObject';

const mergeParams = (refParams, params) => {
  return Object.keys(refParams).reduce((acc, current) => {
    const refValue = refParams[current];
    const nextValue = get(params, [current], refValue);

    if (isObject(refValue)) {
      return { ...acc, [current]: mergeParams(refValue, nextValue) };
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
