import { useEffect } from 'react';
import pluginId from '../pluginId';

const Initializer = ({ setPlugin }) => {
  useEffect(() => {
    setPlugin(pluginId);
  }, [setPlugin]);

  return null;
};

export default Initializer;