import omit from 'lodash/omit';
import { axiosInstance } from '../../../core/utils';

const fetchUser = async () => {
  console.warn(
    'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function getClient'
  );
  const { data } = await axiosInstance.get('/admin/users/me');

  return data.data;
};

const putUser = async (body) => {
  const dataToSend = omit(body, ['confirmPassword', 'currentTheme']);
  console.warn(
    'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function putClient'
  );
  const { data } = await axiosInstance.put('/admin/users/me', dataToSend);

  return { ...data.data, currentTheme: body.currentTheme };
};

export { fetchUser, putUser };
