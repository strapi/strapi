import * as React from 'react';

import { pluginId } from '../pluginId';

type InitializerProps = {
  setPlugin: (plugin: string) => void;
};

const Initializer = ({ setPlugin }: InitializerProps) => {
  const ref = React.useRef(setPlugin);

  React.useEffect(() => {
    ref.current(pluginId);
  }, []);

  return null;
};

export { Initializer };
