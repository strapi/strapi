import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';

import Icon from './Icon';

function LeftMenuLink({ children, to, Component }) {
  return (
    <NavLink to={to}>
      <Icon />
      {Component ? <Component /> : <p>{children}</p>}
    </NavLink>
  );
}

LeftMenuLink.defaultProps = {
  children: null,
};

LeftMenuLink.propTypes = {
  children: PropTypes.node,
  to: PropTypes.string.isRequired,
};

export default memo(LeftMenuLink);
export { LeftMenuLink };
