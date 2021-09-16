import { useContentManagerEditViewDataManager } from '@strapi/helper-plugin';

function useSelect() {
  const { initialData, hasDraftAndPublish } = useContentManagerEditViewDataManager();

  const isPublished = initialData.published_at !== undefined && initialData.published_at !== null;

  return {
    hasDraftAndPublish,
    isPublished,
  };
}

export default useSelect;
