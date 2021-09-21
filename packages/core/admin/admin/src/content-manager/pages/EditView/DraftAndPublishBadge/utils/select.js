import { useCMEditViewDataManager } from '@strapi/helper-plugin';

function useSelect() {
  const { initialData, hasDraftAndPublish } = useCMEditViewDataManager();

  const isPublished = initialData.published_at !== undefined && initialData.published_at !== null;

  return {
    hasDraftAndPublish,
    isPublished,
  };
}

export default useSelect;
