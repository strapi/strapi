import { getFetchClient } from '@strapi/helper-plugin';

import prefixAllUrls from './prefixAllUrls';

const fetchProjectSettings = async () => {
  const { get } = getFetchClient();
  const { data } = await get('/admin/project-settings');

  return prefixAllUrls(data);
};

const postProjectSettings = async (body) => {
  const { post } = getFetchClient();
  const { data } = await post('/admin/project-settings', body, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return prefixAllUrls(data);
};

export { fetchProjectSettings, postProjectSettings };
