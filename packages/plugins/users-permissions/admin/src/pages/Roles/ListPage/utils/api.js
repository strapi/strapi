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
