import React, { useReducer } from 'react';
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
  const [{ customMenuLogo }, dispatch] = useReducer(reducer, initialState);

  const setCustomMenuLogo = logo => {
    return dispatch({
      type: 'SET_CUSTOM_LOGO',
      logoType: 'customMenuLogo',
      logo,
    });
  };

  return (
    <ConfigurationsContext.Provider
      value={{
        authLogo,
        customMenuLogo,
        defaultMenuLogo,
        setCustomMenuLogo,
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
