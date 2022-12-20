import { getFetchClient } from '@strapi/admin/admin/src/utils/getFetchClient';
import { getRequestURL } from '../../../utils';

const fetchData = async () => {
  const { get } = getFetchClient();
  const { data } = await get(getRequestURL('advanced'));
  console.log('fetchData new', getRequestURL('advanced'), data);

  return data;
};

const putAdvancedSettings = (body) => {
  const { put } = getFetchClient();
  console.log('putAdvancedSettings new', getRequestURL('advanced'), body);

  return put(getRequestURL('advanced'), body);
};

export { fetchData, putAdvancedSettings };
