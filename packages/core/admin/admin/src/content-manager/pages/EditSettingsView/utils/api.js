import { axiosInstance } from '../../../../core/utils';
import { getRequestUrl } from '../../../utils';

const putCMSettingsEV = (body, slug, isContentTypeView) => {
  return axiosInstance.put(
    getRequestUrl(
      isContentTypeView ? `content-types/${slug}/configuration` : `components/${slug}/configuration`
    ),
    body
  );
};

export default putCMSettingsEV;
