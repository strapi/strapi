import { getFetchClient } from '@strapi/helper-plugin';

import { getRequestUrl } from '../../../utils';

const putCMSettingsEV = (body, slug, isContentTypeView) => {
  const { put } = getFetchClient();

  return put(
    getRequestUrl(
      isContentTypeView ? `content-types/${slug}/configuration` : `components/${slug}/configuration`
    ),
    body
  );
};

export default putCMSettingsEV;
