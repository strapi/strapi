import { stringify } from 'qs';

const getFolderURL = (pathname, query, folder) => {
  // Content manager do not use pathname
  if (!pathname) {
    return folder ? folder.id : null;
  }

  const { _q, ...queryParamsWithoutQ } = query;
  const queryParamsString = stringify(
    {
      ...queryParamsWithoutQ,
      folder: folder?.id,
    },
    { encode: false }
  );

  // Search query will always fetch the same results
  // we remove it here to allow navigating in a folder and see the result of this navigation
  return `${pathname}${queryParamsString ? `?${queryParamsString}` : ''}`;
};

export default getFolderURL;
