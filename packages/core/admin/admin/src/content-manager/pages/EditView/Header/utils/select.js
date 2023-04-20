import { useCMEditViewDataManager } from '@strapi/helper-plugin';

function useSelect() {
  const {
    initialData,
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
