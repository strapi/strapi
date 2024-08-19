/**
 * @param {string} pathname
 * @param {object} currentQuery
 * @param {string} query._q Search value of the query
 * @param {object} newQuery
 * @param {string} newQuery.folder
 * @param {string} newQuery.folderPath
 * @returns {string}
 */

import { stringify } from 'qs';
import type { Query } from '../types';

export const getFolderURL = (
  pathname: string,
  currentQuery: Query,
  { folder, folderPath }: { folder?: string; folderPath?: string } = {}
) => {
  const { _q, ...queryParamsWithoutQ } = currentQuery;
  const queryParamsString = stringify(
    {
      ...queryParamsWithoutQ,
      folder,
      folderPath,
    },
    { encode: false }
  );

  // Search query will always fetch the same results
  // we remove it here to allow navigating in a folder and see the result of this navigation
  return `${pathname}${queryParamsString ? `?${queryParamsString}` : ''}`;
};
