import { isEmpty } from 'lodash';
import useDataManager from '../../../../hooks/useDataManager';
import useEditView from '../../../../hooks/useEditView';

function useSelect() {
  const { hasDraftAndPublish, modifiedData } = useDataManager();
  const {
    allowedActions: { canDelete },
  } = useEditView();

  let trackerProperty = {};

  if (hasDraftAndPublish) {
    const isDraft = isEmpty(modifiedData.published_at);

    trackerProperty = isDraft ? { status: 'draft' } : { status: 'published' };
  }

  return {
    canDelete,
    hasDraftAndPublish,
    trackerProperty,
  };
}

export default useSelect;
