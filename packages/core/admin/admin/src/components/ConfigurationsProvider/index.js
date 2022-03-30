import React, { useReducer, useRef } from 'react';
import PropTypes from 'prop-types';
import { ConfigurationsContext } from '../../contexts';
import reducer, { initialState } from './reducer';

const ConfigurationsProvider = ({
  children,
  authLogo,
  menuLogo,
  showReleaseNotification,
  showTutorials,
}) => {
  const [{ logos }, dispatch] = useReducer(reducer, initialState);

  const setCustomLogo = (logo, logoType) => {
    return dispatch({
      type: 'SET_CUSTOM_LOGO',
      logoType,
      value: logo,
    });
  };
  const setCustomLogoRef = useRef(setCustomLogo);

  return (
    <ConfigurationsContext.Provider
      value={{
        logos: {
          menu: { custom: logos.menu, default: menuLogo },
          auth: { custom: null, default: authLogo },
        },
        setCustomLogo: setCustomLogoRef.current,
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
