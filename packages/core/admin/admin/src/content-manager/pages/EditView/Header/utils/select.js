import { useCMEditViewDataManager } from '@strapi/helper-plugin';

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
    publishConfirmation,
    onPublishPromptDismissal,
  } = useCMEditViewDataManager();

  return {
    initialData,
    isCreatingEntry,
    isSingleType,
    status,
    layout,
    hasDraftAndPublish,
    modifiedData,
    onPublish,
    onUnpublish,
    publishConfirmation,
    onPublishPromptDismissal,
  };
}

export default useSelect;
