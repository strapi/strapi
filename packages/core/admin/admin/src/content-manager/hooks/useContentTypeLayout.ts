import { useCallback } from 'react';

import { useTypedSelector } from '../../core/store/hooks';

const useContentTypeLayout = () => {
  const currentLayout = useTypedSelector(
    (state) => state['content-manager_editViewLayoutManager'].currentLayout
  );

  const getComponentLayout = useCallback(
    (componentUid: string) => {
      return currentLayout?.components?.[componentUid] ?? {};
    },
    [currentLayout]
  );

  return { ...currentLayout, getComponentLayout };
};

export { useContentTypeLayout };
