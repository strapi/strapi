import { useContext, useRef } from 'react';
import { ConfigurationsContext } from '../../contexts';

const useConfigurations = () => {
  const { setMenuLogo, ...rest } = useContext(ConfigurationsContext);
  const setMenuLogoRef = useRef(setMenuLogo);

  return { setMenuLogo: setMenuLogoRef.current, ...rest };
};

export default useConfigurations;
