import { getRequestURL, axiosInstance } from '../../../utils';

// eslint-disable-next-line import/prefer-default-export
export const fetchData = async toggleNotification => {
  try {
    const { data } = await axiosInstance.get(getRequestURL('providers'));

    return data;
  } catch (err) {
    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    throw new Error('error');
  }
};

export const putProvider = body => {
  return axiosInstance.put(getRequestURL('providers'), body);
};
