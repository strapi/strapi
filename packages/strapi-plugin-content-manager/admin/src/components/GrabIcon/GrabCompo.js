import React from 'react';
import PropTypes from 'prop-types';

const GrabCompo = props => (
  <svg width="5" height="8" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g fill={props.fill} fillRule="evenodd">
      <path d="M0 0h2v2H0zM3 0h2v2H3zM0 3h2v2H0zM3 3h2v2H3zM0 6h2v2H0zM3 6h2v2H3z" />
    </g>
  </svg>
);

GrabCompo.defaultProps = {
  fill: '#B3B5B9',
};

GrabCompo.propTypes = {
  fill: PropTypes.string,
};

export default GrabCompo;
