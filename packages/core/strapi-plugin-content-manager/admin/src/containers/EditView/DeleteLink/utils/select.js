import { isEmpty } from 'lodash';
import { useContentManagerEditViewDataManager } from 'strapi-helper-plugin';

function useSelect() {
  const { hasDraftAndPublish, modifiedData } = useContentManagerEditViewDataManager();

  let trackerProperty = {};

  if (hasDraftAndPublish) {
    const isDraft = isEmpty(modifiedData.published_at);

    trackerProperty = isDraft ? { status: 'draft' } : { status: 'published' };
  }

  return {
    hasDraftAndPublish,
    trackerProperty,
  };
}

export default useSelect;
