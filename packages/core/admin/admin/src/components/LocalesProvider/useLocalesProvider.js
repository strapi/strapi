import { useContext } from 'react';

import LocalesProviderContext from './context';

const useLocalesProvider = () => {
  const { changeLocale, localeNames, messages } = useContext(LocalesProviderContext);

  return { changeLocale, localeNames, messages };
};

export default useLocalesProvider;
