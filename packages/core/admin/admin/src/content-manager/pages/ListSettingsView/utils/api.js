import { axiosInstance } from '../../../../core/utils';
import { getRequestUrl } from '../../../utils';

const putCMSettingsLV = (body, slug) => {
  return axiosInstance.put(getRequestUrl(`content-types/${slug}/configuration`), body);
};

export default putCMSettingsLV;
