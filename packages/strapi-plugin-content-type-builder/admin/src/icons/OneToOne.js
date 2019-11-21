import React from 'react';
import PropTypes from 'prop-types';

const OneToOne = ({ isSelected }) => {
  const stroke = isSelected ? '#1C5DE7' : '#919BAE';
  const rectProps = isSelected
    ? {
        stroke: '#1C5DE7',
      }
    : {
        strokeOpacity: '.1',
        stroke: '#101622',
      };

  return (
    <svg
      width="41"
      height="41"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <defs>
        <rect id="a" x="0" y="0" width="41" height="41" rx="2" />
      </defs>
      <g fill="none" fillRule="evenodd">
        <use fill="#FFF" xlinkHref="#a" />
        <rect {...rectProps} x=".5" y=".5" width="40" height="40" rx="2" />
        <path stroke={stroke} d="M14 21.25h14v1H14z" />
        <rect stroke={stroke} x="7.5" y="18.5" width="6" height="6" rx="3" />
        <rect stroke={stroke} x="28.5" y="18.5" width="6" height="6" rx="3" />
      </g>
    </svg>
  );
};

OneToOne.defaultProps = {
  isSelected: false,
};

OneToOne.propTypes = {
  isSelected: PropTypes.bool,
};

export default OneToOne;
