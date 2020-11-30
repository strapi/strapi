import useDataManager from '../../../../hooks/useDataManager';
import useEditView from '../../../../hooks/useEditView';

function useSelect() {
  const {
    allLayoutData,
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
    componentLayouts: allLayoutData.components,
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
