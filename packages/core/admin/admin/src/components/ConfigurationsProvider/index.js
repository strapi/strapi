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
  const [{ menuLogo }, dispatch] = useReducer(reducer, initialState);

  const setMenuLogo = logo => {
    return dispatch({
      type: 'CHANGE_LOGO',
      logoType: 'menuLogo',
      logo: logo || defaultMenuLogo,
      isCustom: !!logo,
    });
  };

  return (
    <ConfigurationsContext.Provider
      value={{
        authLogo,
        menuLogo,
        setMenuLogo,
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
