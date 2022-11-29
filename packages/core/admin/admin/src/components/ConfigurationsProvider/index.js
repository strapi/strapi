import React, { useMemo, useReducer, useRef } from 'react';
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

  const updateProjectSettings = ({ menuLogo, authLogo }) => {
    return dispatch({
      type: 'UPDATE_PROJECT_SETTINGS',
      values: {
        menuLogo: menuLogo || defaultMenuLogo,
        authLogo: authLogo || defaultAuthLogo,
      },
    });
  };

  const updateProjectSettingsRef = useRef(updateProjectSettings);

  const configurationValue = useMemo(() => {
    return {
      logos: {
        menu: { custom: menuLogo, default: defaultMenuLogo },
        auth: { custom: authLogo, default: defaultAuthLogo },
      },
      updateProjectSettings: updateProjectSettingsRef.current,
      showReleaseNotification,
      showTutorials,
    };
  }, [
    menuLogo,
    defaultMenuLogo,
    authLogo,
    defaultAuthLogo,
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
