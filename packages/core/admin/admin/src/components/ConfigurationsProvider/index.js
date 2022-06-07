import React, { useReducer, useRef } from 'react';
import PropTypes from 'prop-types';
import { ConfigurationsContext } from '../../contexts';
import reducer, { initialState } from './reducer';

const ConfigurationsProvider = ({
  children,
  authLogo,
  menuLogo: defaultMenuLogo,
  showReleaseNotification,
  showTutorials,
}) => {
  const [{ menuLogo }, dispatch] = useReducer(reducer, initialState);

  const updateProjectSettings = ({ menuLogo }) => {
    return dispatch({
      type: 'UPDATE_PROJECT_SETTINGS',
      values: {
        menuLogo: menuLogo || defaultMenuLogo,
      },
    });
  };

  const updateProjectSettingsRef = useRef(updateProjectSettings);

  return (
    <ConfigurationsContext.Provider
      value={{
        logos: {
          menu: { custom: menuLogo, default: defaultMenuLogo },
          auth: { custom: null, default: authLogo },
        },
        updateProjectSettings: updateProjectSettingsRef.current,
        showReleaseNotification,
        showTutorials,
      }}
    >
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
