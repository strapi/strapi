import React from 'react';
import PropTypes from 'prop-types';

const OneToMany = ({ isSelected, ...rest }) => {
  const stroke = isSelected ? '#1C5DE7' : '#919BAE';
  let rectProps = {
    strokeOpacity: '.1',
    stroke: '#1C5DE7',
  };

  if (isSelected) {
    rectProps = {
      stroke: '#1C5DE7',
    };
  }

  return (
    <svg
      {...rest}
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
        <path fill={stroke} d="M13 20.75h14v2H13z" />
        <path
          fill={stroke}
          d="M11.447 19.437l15.73-7.672.876 1.798-15.729 7.672z"
        />
        <rect stroke={stroke} x="6.5" y="18.5" width="6" height="6" rx="3" />
        <rect stroke={stroke} x="27.5" y="18.5" width="6" height="6" rx="3" />
        <rect stroke={stroke} x="27.5" y="8.5" width="6" height="6" rx="3" />
        <path
          fill={stroke}
          d="M27.943 29.912L12.214 22.24l-.657 1.348 15.729 7.672z"
        />
        <rect
          stroke={stroke}
          transform="matrix(-1 0 0 1 61 0)"
          x="27.5"
          y="28.5"
          width="6"
          height="6"
          rx="3"
        />
      </g>
    </svg>
  );
};

OneToMany.defaultProps = {
  isSelected: false,
};

OneToMany.propTypes = {
  isSelected: PropTypes.bool,
};

export default OneToMany;
