import { getFetchClient } from '@strapi/admin/admin/src/utils/getFetchClient';
import { axiosInstance, getRequestURL } from '../../../utils';

const fetchData = async () => {
  const { get } = getFetchClient();
  const { data } = await get(getRequestURL('advanced'));

  return data;
};

const putAdvancedSettings = (body) => {
  return axiosInstance.put(getRequestURL('advanced'), body);
};

export { fetchData, putAdvancedSettings };
