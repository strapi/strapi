import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';

import Icon from './Icon';

function LeftMenuLink({ children, to, CustomComponent }) {
  return (
    <NavLink to={to}>
      <Icon />
      {CustomComponent ? <CustomComponent /> : <p>{children}</p>}
    </NavLink>
  );
}

LeftMenuLink.defaultProps = {
  children: null,
  CustomComponent: null,
};

LeftMenuLink.propTypes = {
  children: PropTypes.node,
  to: PropTypes.string.isRequired,
};

export default memo(LeftMenuLink);
export { LeftMenuLink };
