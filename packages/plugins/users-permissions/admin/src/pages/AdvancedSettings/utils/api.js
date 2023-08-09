import { getFetchClient } from '@strapi/helper-plugin';

const fetchData = async () => {
  const { get } = getFetchClient();
  const { data } = await get('/users-permissions/advanced');

  return data;
};

const putAdvancedSettings = (body) => {
  const { put } = getFetchClient();

  return put('/users-permissions/advanced', body);
};

export { fetchData, putAdvancedSettings };
