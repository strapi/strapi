import React from 'react';
import PropTypes from 'prop-types';

const Component = props => (
  <svg width="22" height="22" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
      <g
        fill={props.fill}
        transform="translate(-581.000000, -679.000000)"
        stroke="#F3F4F4"
        strokeWidth="5"
      >
        <g id="Container" transform="translate(0.000000, -40.000000)">
          <g id="Content">
            <g id="Forms" transform="translate(529.000000, 10.000000)">
              <g id="Static-fields" transform="translate(9.154730, 0.000000)">
                <g
                  id="Group-fields"
                  transform="translate(31.845270, 693.000000)"
                >
                  <path
                    d="M13.9999958,19 C13.2018159,29.6666667 18.5351493,35 29.9999958,35"
                    id="Path-5"
                  ></path>
                </g>
              </g>
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
