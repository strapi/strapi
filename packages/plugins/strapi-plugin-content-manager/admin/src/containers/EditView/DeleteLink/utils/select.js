import { isEmpty } from 'lodash';
import useDataManager from '../../../../hooks/useDataManager';

function useSelect() {
  const { hasDraftAndPublish, modifiedData } = useDataManager();

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
