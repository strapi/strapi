import useDataManager from '../../../../hooks/useDataManager';

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

  return {
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
