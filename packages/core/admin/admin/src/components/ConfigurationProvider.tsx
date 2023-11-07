import * as React from 'react';

import { ConfigurationContextProvider, ConfigurationContextValue } from '../contexts/configuration';

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

  return (
    <ConfigurationContextProvider
      updateProjectSettings={updateProjectSettings}
      showReleaseNotification={showReleaseNotification}
      showTutorials={showTutorials}
      logos={{
        menu: { custom: menuLogo, default: defaultMenuLogo },
        auth: { custom: authLogo, default: defaultAuthLogo },
      }}
    >
      {children}
    </ConfigurationContextProvider>
  );
};

export { ConfigurationProvider };
export type { ConfigurationProviderProps };
