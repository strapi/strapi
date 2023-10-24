import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import isEmpty from 'lodash/isEmpty';

function useSelect() {
  const { modifiedData } = useCMEditViewDataManager();

  let trackerProperty = {};

  const isDraft = isEmpty(modifiedData.publishedAt);

  trackerProperty = isDraft ? { status: 'draft' } : { status: 'published' };

  return {
    trackerProperty,
  };
}

export default useSelect;
