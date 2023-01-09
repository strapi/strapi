import { getFetchClient } from '@strapi/admin/admin/src/utils/getFetchClient';
import { getRequestURL, axiosInstance } from '../../../utils';

// eslint-disable-next-line import/prefer-default-export
export const fetchData = async (toggleNotification) => {
  try {
    const { get } = getFetchClient();
    const { data } = await get(getRequestURL('providers'));

    return data;
  } catch (err) {
    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    throw new Error('error');
  }
};

export const putProvider = (body) => {
  return axiosInstance.put(getRequestURL('providers'), body);
};
