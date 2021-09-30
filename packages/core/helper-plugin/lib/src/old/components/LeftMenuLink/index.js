import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';

import Icon from './Icon';

function LeftMenuLink({ children, to, search, CustomComponent }) {
  return (
    <NavLink to={`${to}${search ? `?${search}` : ''}`}>
      <Icon />
      {CustomComponent ? <CustomComponent /> : <p>{children}</p>}
    </NavLink>
  );
}

LeftMenuLink.defaultProps = {
  children: null,
  CustomComponent: null,
  search: null,
};

LeftMenuLink.propTypes = {
  children: PropTypes.node,
  to: PropTypes.string.isRequired,
  search: PropTypes.string,
};

export default memo(LeftMenuLink);
export { LeftMenuLink };
