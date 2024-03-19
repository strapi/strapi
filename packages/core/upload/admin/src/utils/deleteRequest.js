import { getFetchClient } from '@strapi/admin/strapi-admin';

export const deleteRequest = (type, id) => {
  const { del } = getFetchClient();

  return del(`/upload/${type}/${id}`);
};
