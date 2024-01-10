import { useQueryParams } from '@strapi/helper-plugin';
import QueryString, { parse, stringify } from 'qs';

import { useTypedSelector } from '../../core/store/hooks';
import { isObject } from '../../utils/objects';

import type { ContentManagerAppState } from '../pages/App';

const useFindRedirectionLink = (slug: string) => {
  const [{ rawQuery }] = useQueryParams();
  const collectionTypesMenuLinks = useTypedSelector(
    (state) => state['content-manager_app'].collectionTypeLinks
  );
  const redirectionLink = getRedirectionLink(collectionTypesMenuLinks, slug, rawQuery);

  return redirectionLink;
};

/**
 * Updates the leafs of the first argument
 */
const mergeParams = (
  initialParams: QueryString.ParsedQs,
  params: QueryString.ParsedQs
): QueryString.ParsedQs => {
  return Object.keys(initialParams).reduce<QueryString.ParsedQs>((acc, current) => {
    const initialValue = initialParams[current];
    const nextValue = params[current] ?? initialValue;

    if (isObject(initialValue)) {
      // @ts-expect-error – TODO: fix this type error.
      return { ...acc, [current]: mergeParams(initialValue, nextValue) };
    }

    acc[current] = nextValue;

    return acc;
  }, {});
};

const getRedirectionLink = (
  links: ContentManagerAppState['collectionTypeLinks'],
  slug: string,
  rawQuery: string
) => {
  const matchingLink = links.find(({ to }) => to.includes(slug));

  if (!matchingLink) {
    return '/';
  }

  const { to, search } = matchingLink;
  const searchQueryParams = parse(search ?? '');
  const currentQueryParams = parse(rawQuery.substring(1));

  const mergedParams = mergeParams(searchQueryParams, currentQueryParams);

  const link = `${to}?${stringify(mergedParams, { encode: false })}`;

  return link;
};

export { useFindRedirectionLink };
