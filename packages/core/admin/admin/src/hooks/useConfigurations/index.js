import { useContext, useRef } from 'react';
import { ConfigurationsContext } from '../../contexts';

const useConfigurations = () => {
  const context = useContext(ConfigurationsContext);
  const contextRef = useRef(context);

  return contextRef.current;
};

export default useConfigurations;
