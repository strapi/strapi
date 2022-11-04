import { axiosInstance } from '../../../../core/utils';
import { getRequestUrl } from '../../../utils';

const putCMSettingsLV = (body, slug) => {
  console.warn(
    'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function putClient'
  );

  return axiosInstance.put(getRequestUrl(`content-types/${slug}/configuration`), body);
};

export default putCMSettingsLV;
