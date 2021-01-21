import React from 'react';
import PropTypes from 'prop-types';

const Na = ({ fill, fontFamily, fontSize, fontWeight, height, textFill, width, ...rest }) => {
  return (
    <svg {...rest} width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd">
        <rect fill={fill} width={width} height={height} rx="17.5" />
        <text fontFamily={fontFamily} fontSize={fontSize} fontWeight={fontWeight} fill={textFill}>
          <tspan x="6" y="22">
            N/A
          </tspan>
        </text>
      </g>
    </svg>
  );
};

Na.defaultProps = {
  fill: '#fafafb',
  fontFamily: 'Lato-Medium, Lato',
  fontSize: '12',
  fontWeight: '400',
  height: '35',
  textFill: '#838383',
  width: '35',
};

Na.propTypes = {
  fill: PropTypes.string,
  fontFamily: PropTypes.string,
  fontSize: PropTypes.string,
  fontWeight: PropTypes.string,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  textFill: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

export default Na;
