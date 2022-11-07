import { axiosInstance } from '../../../../../core/utils';
import prefixAllUrls from './prefixAllUrls';

const fetchProjectSettings = async () => {
  console.warn(
    'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function getClient'
  );
  const { data } = await axiosInstance.get('/admin/project-settings');

  return prefixAllUrls(data);
};

const postProjectSettings = async (body) => {
  console.warn(
    'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function postClient'
  );
  const { data } = await axiosInstance.post('/admin/project-settings', body);

  return prefixAllUrls(data);
};

export { fetchProjectSettings, postProjectSettings };
