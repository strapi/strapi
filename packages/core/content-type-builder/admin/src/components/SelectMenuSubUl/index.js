import React from 'react';
import PropTypes from 'prop-types';
import ToggleUl from './ToggleUl';

const SubUl = ({ children, isOpen }) => {
  return (
    <ToggleUl tag="ul" isOpen={isOpen}>
      {children}
    </ToggleUl>
  );
};

SubUl.defaultProps = {
  children: null,
  isOpen: false,
};

SubUl.propTypes = {
  children: PropTypes.node,
  isOpen: PropTypes.bool,
};

export default SubUl;
