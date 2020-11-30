import React, { memo } from 'react';
import PropTypes from 'prop-types';
import StyledBody from './StyledBody';

const Body = ({ children }) => (
  <StyledBody>
    <div>{children}</div>
  </StyledBody>
);

Body.propTypes = {
  children: PropTypes.node.isRequired,
};

export default memo(Body);
