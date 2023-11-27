import * as React from 'react';

import { useLocales } from '../hooks/useLocales';
import { pluginId } from '../pluginId';

type InitializerProps = {
  setPlugin: (plugin: string) => void;
};

const Initializer = ({ setPlugin }: InitializerProps) => {
  const { isLoading, locales } = useLocales();
  const ref = React.useRef<InitializerProps['setPlugin']>();

  ref.current = setPlugin;

  React.useEffect(() => {
    if (!isLoading && locales.length > 0) {
      ref.current!(pluginId);
    }
  }, [isLoading, locales]);

  return null;
};

export { Initializer };
