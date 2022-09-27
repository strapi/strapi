/**
 *
 * Initializer
 *
 */

import React, { useEffect, useRef } from 'react';
import pluginId from '../../pluginId';

type InitializerProps = {
  setPlugin: (id: string) => void;
};

const Initializer: React.FC<InitializerProps> = ({ setPlugin }) => {
  const ref = useRef<(id: string) => void | null>(setPlugin);

  useEffect(() => {
    ref.current(pluginId);
  }, []);

  return null;
};

export default Initializer;
