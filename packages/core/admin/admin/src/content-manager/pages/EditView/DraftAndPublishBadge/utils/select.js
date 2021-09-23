import { useCMEditViewDataManager } from '@strapi/helper-plugin';

function useSelect() {
  const { initialData, hasDraftAndPublish } = useCMEditViewDataManager();

  const isPublished = initialData.publishedAt !== undefined && initialData.publishedAt !== null;

  return {
    hasDraftAndPublish,
    isPublished,
  };
}

export default useSelect;
