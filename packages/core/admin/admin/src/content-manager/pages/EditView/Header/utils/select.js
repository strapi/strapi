import { useCMEditViewDataManager } from '@strapi/helper-plugin';

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
  } = useCMEditViewDataManager();

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
