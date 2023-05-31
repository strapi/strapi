import { getFetchClient } from '@strapi/helper-plugin';

const putUser = async (id, body) => {
  const { put } = getFetchClient();

  const { data } = await put(`/admin/users/${id}`, body);

  return data.data;
};

export { putUser };
