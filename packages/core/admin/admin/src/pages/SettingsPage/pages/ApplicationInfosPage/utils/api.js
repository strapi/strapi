import { axiosInstance } from '../../../../../core/utils';
import prefixAllUrls from './prefixAllUrls';

const fetchProjectSettings = async () => {
  const { data } = await axiosInstance.get('/admin/project-settings');
  console.warn(
    'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function getClient'
  );

  return prefixAllUrls(data);
};

const postProjectSettings = async (body) => {
  const { data } = await axiosInstance.post('/admin/project-settings', body);
  console.warn(
    'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function postClient'
  );

  return prefixAllUrls(data);
};

export { fetchProjectSettings, postProjectSettings };
