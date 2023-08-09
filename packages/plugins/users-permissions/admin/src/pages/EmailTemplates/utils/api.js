import { getFetchClient } from '@strapi/helper-plugin';

const fetchData = async () => {
  const { get } = getFetchClient();
  const { data } = await get('/users-permissions/email-templates');

  return data;
};

const putEmailTemplate = (body) => {
  const { put } = getFetchClient();

  return put('/users-permissions/email-templates', body);
};

export { fetchData, putEmailTemplate };
