import { getFetchClient } from '@strapi/helper-plugin';

import getRequestUrl from './getRequestUrl';

export const deleteRequest = (type, id) => {
  const { del } = getFetchClient();
  const url = getRequestUrl(`/${type}/${id}`);

  return del(url);
};
