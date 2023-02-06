import { getFetchClient } from '@strapi/helper-plugin';

const fetchData = async (search, notify) => {
  const { get } = getFetchClient();
  const {
    data: { data },
  } = await get(`/admin/users${search}`);

  notify();

  return data;
};

const deleteData = async (ids) => {
  const { post } = getFetchClient();

  await post('/admin/users/batch-delete', { ids });
};

export { deleteData, fetchData };
