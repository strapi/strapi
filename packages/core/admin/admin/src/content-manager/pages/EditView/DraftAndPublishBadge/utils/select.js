import { useCMEditViewDataManager } from '@strapi/helper-plugin';

function useSelect() {
  const { initialData } = useCMEditViewDataManager();

  const isPublished = initialData.publishedAt !== undefined && initialData.publishedAt !== null;

  return {
    isPublished,
  };
}

export default useSelect;
