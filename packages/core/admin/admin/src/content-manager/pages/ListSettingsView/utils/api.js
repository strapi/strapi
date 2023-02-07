import { getFetchClient } from '@strapi/helper-plugin';
import { getRequestUrl } from '../../../utils';

const putCMSettingsLV = (body, slug) => {
  const { put } = getFetchClient();

  return put(getRequestUrl(`content-types/${slug}/configuration`), body);
};

export default putCMSettingsLV;
