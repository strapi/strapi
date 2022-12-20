import { getFetchClient } from '@strapi/admin/admin/src/utils/getFetchClient';
import { getRequestURL } from '../../../utils';

const fetchData = async () => {
  const { get } = getFetchClient();
  const { data } = await get(getRequestURL('advanced'));

  return data;
};

const putAdvancedSettings = (body) => {
  const { put } = getFetchClient();

  return put(getRequestURL('advanced'), body);
};

export { fetchData, putAdvancedSettings };
