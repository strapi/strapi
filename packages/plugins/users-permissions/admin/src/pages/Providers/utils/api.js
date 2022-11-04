import { getRequestURL, axiosInstance } from '../../../utils';

// eslint-disable-next-line import/prefer-default-export
export const fetchData = async (toggleNotification) => {
  try {
    const { data } = await axiosInstance.get(getRequestURL('providers'));
    console.warn(
      'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function getClient'
    );

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
  console.warn(
    'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function putClient'
  );

  return axiosInstance.put(getRequestURL('providers'), body);
};
