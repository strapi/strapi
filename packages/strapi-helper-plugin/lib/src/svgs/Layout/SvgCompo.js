import React from 'react';
import PropTypes from 'prop-types';

const SvgCompo = props => (
  <svg width="13" height="11" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g fill={props.fill} fillRule="evenodd">
      <rect x="4" y="8" width="9" height="3" rx="1.5" />
      <rect y="4" width="9" height="3" rx="1.5" />
      <rect x="3" width="9" height="3" rx="1.5" />
    </g>
  </svg>
);

SvgCompo.propTypes = {
  fill: PropTypes.string,
};

SvgCompo.defaultProps = {
  fill: '#4B515A',
};

export default SvgCompo;
