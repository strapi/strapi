import { isEmpty } from 'lodash';
import useDataManager from '../../../../hooks/useDataManager';
import useEditView from '../../../../hooks/useEditView';

function useSelect() {
  const {
    initialData,
    isCreatingEntry,
    isSingleType,
    slug,
    clearData,
    hasDraftAndPublish,
    modifiedData,
  } = useDataManager();
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
    clearData,
    dataId: initialData.id,
    hasDraftAndPublish,
    isCreatingEntry,
    isSingleType,
    trackerProperty,
    slug,
  };
}

export default useSelect;
