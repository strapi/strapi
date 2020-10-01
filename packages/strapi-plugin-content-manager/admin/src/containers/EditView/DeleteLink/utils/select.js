import useDataManager from '../../../../hooks/useDataManager';
import useEditView from '../../../../hooks/useEditView';

function useSelect() {
  const { initialData, isCreatingEntry, isSingleType, slug, clearData } = useDataManager();
  const {
    allowedActions: { canDelete },
  } = useEditView();

  return {
    canDelete,
    clearData,
    dataId: initialData.id,
    isCreatingEntry,
    isSingleType,
    slug,
  };
}

export default useSelect;
