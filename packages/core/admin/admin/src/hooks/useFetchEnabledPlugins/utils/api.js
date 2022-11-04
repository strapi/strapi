import { axiosInstance } from '../../../core/utils';

const fetchEnabledPlugins = async () => {
  const { data } = await axiosInstance.get('/admin/plugins');
  console.warn(
    'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function getClient'
  );

  return data;
};

export { fetchEnabledPlugins };
