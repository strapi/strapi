import React from 'react';
import PropTypes from 'prop-types';
import SettingsHeaderSearchContext from '../../contexts/SettingsHeaderSearchContext';

const SettingsHeaderSearchContextProvider = ({ children, ...rest }) => {
  return (
    <SettingsHeaderSearchContext.Provider value={rest.value}>
      {children}
    </SettingsHeaderSearchContext.Provider>
  );
};

SettingsHeaderSearchContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default SettingsHeaderSearchContextProvider;
