import { getRequestURL, axiosInstance } from '../../../../utils';

export const fetchData = async (toggleNotification, notifyStatus) => {
  try {
    console.warn(
      'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function getClient'
    );
    const { data } = await axiosInstance.get(getRequestURL('roles'));
    notifyStatus('The roles have loaded successfully');

    return data;
  } catch (err) {
    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    throw new Error('error');
  }
};

export const deleteData = async (id, toggleNotification) => {
  try {
    console.warn(
      'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function deleteClient'
    );
    await axiosInstance.delete(`${getRequestURL('roles')}/${id}`);
  } catch (error) {
    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error', defaultMessage: 'An error occured' },
    });
  }
};
