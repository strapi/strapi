import { useContext, useRef } from 'react';
import { ConfigurationsContext } from '../../contexts';

const useConfigurations = () => {
  const { setCustomMenuLogo, ...rest } = useContext(ConfigurationsContext);
  const setCustomMenuLogoRef = useRef(setCustomMenuLogo);

  return { setCustomMenuLogo: setCustomMenuLogoRef.current, ...rest };
};

export default useConfigurations;
