import React from 'react';
import PropTypes from 'prop-types';
import UserContext from '../../contexts/UserContext';

const UserProvider = ({ children, value }) => {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

UserProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default UserProvider;
