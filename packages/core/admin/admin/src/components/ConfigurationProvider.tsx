import * as React from 'react';

import { ConfigurationContext, ConfigurationContextValue } from '../contexts/configuration';

interface ConfigurationProviderProps {
  children: React.ReactNode;
  authLogo: string;
  menuLogo: string;
  showReleaseNotification?: boolean;
  showTutorials?: boolean;
}

type LogoKeys = keyof ConfigurationContextValue['logos'];

const ConfigurationProvider = ({
  children,
  authLogo: defaultAuthLogo,
  menuLogo: defaultMenuLogo,
  showReleaseNotification = false,
  showTutorials = false,
}: ConfigurationProviderProps) => {
  const [{ menuLogo, authLogo }, setLogos] = React.useState<{
    [_Key in `${LogoKeys}Logo`]?: ConfigurationContextValue['logos'][LogoKeys]['custom'];
  }>({
    menuLogo: null,
    authLogo: null,
  });

  const updateProjectSettings: ConfigurationContextValue['updateProjectSettings'] =
    React.useCallback(
      ({ menuLogo, authLogo }) => {
        setLogos({
          menuLogo: menuLogo || defaultMenuLogo,
          authLogo: authLogo || defaultAuthLogo,
        });
      },
      [defaultAuthLogo, defaultMenuLogo]
    );

  const configurationValue = React.useMemo(() => {
    return {
      logos: {
        menu: { custom: menuLogo, default: defaultMenuLogo },
        auth: { custom: authLogo, default: defaultAuthLogo },
      },
      updateProjectSettings,
      showReleaseNotification,
      showTutorials,
    };
  }, [
    menuLogo,
    defaultMenuLogo,
    authLogo,
    defaultAuthLogo,
    updateProjectSettings,
    showReleaseNotification,
    showTutorials,
  ]);

  return (
    <ConfigurationContext.Provider value={configurationValue}>
      {children}
    </ConfigurationContext.Provider>
  );
};

export { ConfigurationProvider };
export type { ConfigurationProviderProps };
