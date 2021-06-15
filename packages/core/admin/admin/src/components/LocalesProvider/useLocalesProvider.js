import { useContext } from 'react';
import LocalesProviderContext from './context';

const useLocalesProvider = () => {
  const { changeLocale, localesNativeNames, messages } = useContext(LocalesProviderContext);

  return { changeLocale, localesNativeNames, messages };
};

export default useLocalesProvider;
