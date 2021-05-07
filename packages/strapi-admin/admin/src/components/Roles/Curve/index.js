import React, { memo } from 'react';
import PropTypes from 'prop-types';

const Curve = props => (
  <svg
    style={{
      height: '14px',
      transform: 'translate(-3.2px, -1px)',
      position: 'relative',
    }}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 21.08 21"
    {...props}
  >
    <g>
      <path
        d="M2.58 2.5q-1.2 16 16 16"
        fill="none"
        stroke={props.fill}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5"
      />
    </g>
  </svg>
);

Curve.defaultProps = {
  fill: '#f3f4f4',
};
Curve.propTypes = {
  fill: PropTypes.string,
};

export default memo(Curve);
