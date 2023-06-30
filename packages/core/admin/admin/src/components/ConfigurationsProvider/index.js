import React, { useCallback, useMemo, useReducer } from 'react';

import PropTypes from 'prop-types';

import { ConfigurationsContext } from '../../contexts';

import reducer, { initialState } from './reducer';

const ConfigurationsProvider = ({
  children,
  authLogo: defaultAuthLogo,
  menuLogo: defaultMenuLogo,
  showReleaseNotification,
  showTutorials,
}) => {
  const [{ menuLogo, authLogo }, dispatch] = useReducer(reducer, initialState);

  const updateProjectSettings = useCallback(
    ({ menuLogo, authLogo }) => {
      return dispatch({
        type: 'UPDATE_PROJECT_SETTINGS',
        values: {
          menuLogo: menuLogo || defaultMenuLogo,
          authLogo: authLogo || defaultAuthLogo,
        },
      });
    },
    [defaultAuthLogo, defaultMenuLogo]
  );

  const configurationValue = useMemo(() => {
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
    <ConfigurationsContext.Provider value={configurationValue}>
      {children}
    </ConfigurationsContext.Provider>
  );
};

ConfigurationsProvider.propTypes = {
  authLogo: PropTypes.string.isRequired,
  children: PropTypes.element.isRequired,
  menuLogo: PropTypes.string.isRequired,
  showReleaseNotification: PropTypes.bool.isRequired,
  showTutorials: PropTypes.bool.isRequired,
};

export default ConfigurationsProvider;
