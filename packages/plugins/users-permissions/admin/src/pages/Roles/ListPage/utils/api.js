import { getRequestURL, axiosInstance } from '../../../../utils';

export const fetchData = async (toggleNotification, notifyStatus) => {
  try {
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
    await axiosInstance.delete(`${getRequestURL('roles')}/${id}`);
  } catch (error) {
    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error', defaultMessage: 'An error occurred' },
    });
  }
};
