import React from 'react';
import PropTypes from 'prop-types';

const Component = props => (
  <svg width="12" height="13" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
      <g transform="translate(-11.000000, -5.000000)" fill={props.fill}>
        <g>
          <g transform="translate(11.000000, 4.000000)">
            <g transform="translate(5.000000, 4.720000)">
              <rect x="1" y="0" width="1" height="5" rx="0.5"></rect>
              <rect
                id="Rectangle"
                x="0"
                y="4"
                width="3"
                height="3"
                rx="1.5"
              ></rect>
            </g>
            <g transform="translate(9.221089, 3.500000) rotate(60.000000) translate(-9.221089, -3.500000) translate(7.721089, 0.000000)">
              <rect x="1" y="2" width="1" height="5" rx="0.5"></rect>
              <rect x="0" y="0" width="3" height="3" rx="1.5"></rect>
            </g>
            <g transform="translate(3.781089, 3.500000) rotate(-60.000000) translate(-3.781089, -3.500000) translate(2.281089, 0.000000)">
              <rect
                transform="translate(1.500000, 4.500000) scale(-1, 1) translate(-1.500000, -4.500000) "
                x="1"
                y="2"
                width="1"
                height="5"
                rx="0.5"
              ></rect>
              <rect x="0" y="0" width="3" height="3" rx="1.5"></rect>
            </g>
          </g>
        </g>
      </g>
    </g>
  </svg>
);

Component.defaultProps = {
  fill: '#fff',
};

Component.propTypes = {
  fill: PropTypes.string,
};

export default Component;
