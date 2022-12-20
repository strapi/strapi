import { getFetchClient } from '@strapi/admin/admin/src/utils/getFetchClient';
import { getRequestURL } from '../../../utils';

const fetchData = async () => {
  const { get } = getFetchClient();
  const { data } = await get(getRequestURL('email-templates'));

  return data;
};

const putEmailTemplate = (body) => {
  const { put } = getFetchClient();

  return put(getRequestURL('email-templates'), body);
};

export { fetchData, putEmailTemplate };
