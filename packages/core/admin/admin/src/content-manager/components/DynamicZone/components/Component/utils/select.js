import { useMemo } from 'react';
import useMainValue from '../hooks/useMainValue';
import { useContentTypeLayout } from '../../../../../hooks';

function useSelect({ componentUid, name, index }) {
  const { getComponentLayout } = useContentTypeLayout();
  const componentLayoutData = useMemo(() => {
    const layout = getComponentLayout(componentUid);

    return layout;
  }, [componentUid, getComponentLayout]);
  const mainValue = useMainValue(componentLayoutData, [name, index]);

  return {
    mainValue,
  };
}

export default useSelect;
