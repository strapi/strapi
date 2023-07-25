import { getFetchClient } from '@strapi/helper-plugin';

export const deleteRequest = (type, id) => {
  const { del } = getFetchClient();

  return del(`/upload/${type}/${id}`);
};
