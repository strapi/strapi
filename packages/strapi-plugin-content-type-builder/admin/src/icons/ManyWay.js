import React from 'react';
import PropTypes from 'prop-types';

const ManyWay = ({ isSelected, ...rest }) => {
  const rectStroke = isSelected ? '#1C5DE7' : '#E3E9F3';
  const stroke = isSelected ? '#1C5DE7' : '#ABB3C2';
  const otherStroke = isSelected ? '#1C5DE7' : '#ABB3C4';

  return (
    <svg {...rest} width="41" height="41" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd">
        <rect width="41" height="41" rx="2" fill="#FFF" />
        <rect stroke={rectStroke} x=".5" y=".5" width="40" height="40" rx="2" />
        <g transform="translate(7.5 6)">
          <path stroke={stroke} d="M6.5 15.25h14v1h-14z" />
          <rect stroke={stroke} y="12.5" width="6" height="6" rx="3" />
          <path stroke={otherStroke} d="M26 15.5l-5 3v-6z" />
          <path stroke={stroke} d="M5.965 17.283l12.124 7-.5.867-12.124-7z" />
          <path stroke={otherStroke} d="M22.727 27.25l-5.83.098 3-5.196z" />
          <path stroke={stroke} d="M5.965 13.717l12.124-7-.5-.867-12.124 7z" />
          <path stroke={otherStroke} d="M22.727 3.75l-5.83-.098 3 5.196z" />
        </g>
      </g>
    </svg>
  );
};

ManyWay.defaultProps = {
  isSelected: false,
};

ManyWay.propTypes = {
  isSelected: PropTypes.bool,
};

export default ManyWay;
