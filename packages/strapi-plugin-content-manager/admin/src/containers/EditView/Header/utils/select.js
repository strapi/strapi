import useDataManager from '../../../../hooks/useDataManager';
import useEditView from '../../../../hooks/useEditView';

function useSelect() {
  const {
    initialData,
    isCreatingEntry,
    isSingleType,
    status,
    layout,
    hasDraftAndPublish,
    modifiedData,
    onPublish,
    onUnpublish,
  } = useDataManager();
  const {
    allowedActions: { canUpdate, canCreate, canPublish },
  } = useEditView();

  return {
    canUpdate,
    canCreate,
    canPublish,
    initialData,
    isCreatingEntry,
    isSingleType,
    status,
    layout,
    hasDraftAndPublish,
    modifiedData,
    onPublish,
    onUnpublish,
  };
}

export default useSelect;
