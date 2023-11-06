import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import isEmpty from 'lodash/isEmpty';

function useSelect() {
  const { hasDraftAndPublish, modifiedData } = useCMEditViewDataManager();

  let trackerProperty = {};

  if (hasDraftAndPublish) {
    const isDraft = isEmpty(modifiedData.publishedAt);

    trackerProperty = isDraft ? { status: 'draft' } : { status: 'published' };
  }

  return {
    hasDraftAndPublish,
    trackerProperty,
  };
}

export default useSelect;
