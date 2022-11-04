import { axiosInstance } from '../../../../core/utils';
import { getRequestUrl } from '../../../utils';

const putCMSettingsEV = (body, slug, isContentTypeView) => {
  console.warn(
    'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function putClient'
  );

  return axiosInstance.put(
    getRequestUrl(
      isContentTypeView ? `content-types/${slug}/configuration` : `components/${slug}/configuration`
    ),
    body
  );
};

export default putCMSettingsEV;
