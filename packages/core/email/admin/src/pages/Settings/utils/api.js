import axiosInstance from '../../../utils/axiosInstance';

const fetchEmailSettings = async () => {
  console.warn(
    'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function getClient'
  );
  const { data } = await axiosInstance.get('/email/settings');

  return data.config;
};

const postEmailTest = async (body) => {
  console.warn(
    'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function postClient'
  );
  await axiosInstance.post('/email/test', body);
};

export { fetchEmailSettings, postEmailTest };
