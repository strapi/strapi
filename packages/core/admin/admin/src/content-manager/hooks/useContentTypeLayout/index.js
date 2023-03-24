import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import selectLayout from '../../pages/EditViewLayoutManager/selectors';

const useContentTypeLayout = () => {
  const currentLayout = useSelector(selectLayout);

  const getComponentLayout = useCallback(
    (componentUid) => {
      return currentLayout?.components?.[componentUid] ?? {};
    },
    [currentLayout]
  );

  return { ...currentLayout, getComponentLayout };
};

export default useContentTypeLayout;
