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

  let property = {};

  if (hasDraftAndPublish) {
    const isDraft = isEmpty(modifiedData.published_at);

    property = isDraft ? { status: 'draft' } : { status: 'published' };
  }

  return {
    canDelete,
    clearData,
    dataId: initialData.id,
    hasDraftAndPublish,
    isCreatingEntry,
    isSingleType,
    property,
    slug,
  };
}

export default useSelect;
