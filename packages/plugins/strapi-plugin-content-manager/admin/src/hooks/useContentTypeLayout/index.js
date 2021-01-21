import { useCallback, useContext } from 'react';
import { get } from 'lodash';
import { ContentTypeLayoutContext } from '../../contexts';

const useContentTypeLayout = () => {
  const layout = useContext(ContentTypeLayoutContext);

  const getComponentLayout = useCallback(
    componentUid => {
      return get(layout, ['components', componentUid], {});
    },
    [layout]
  );

  return { ...layout, getComponentLayout };
};

export default useContentTypeLayout;
