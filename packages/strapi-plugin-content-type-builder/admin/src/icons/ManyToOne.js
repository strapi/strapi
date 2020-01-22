import React from 'react';
import PropTypes from 'prop-types';

const ManyToOne = ({ isSelected, ...rest }) => {
  const stroke = isSelected ? '#1C5DE7' : '#919BAE';
  let rectProps = {
    strokeOpacity: '.1',
    stroke: '#101622',
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
      <g transform="matrix(-1 0 0 1 41 0)" fill="none" fillRule="evenodd">
        <use fill="#FFF" xlinkHref="#a" />
        <rect {...rectProps} x=".5" y=".5" width="40" height="40" rx="2" />
        <path
          stroke={stroke}
          d="M13.5 21.25h13v1h-13zM12.225 19.642l14.83-7.233.439.899-14.83 7.233z"
        />
        <rect stroke={stroke} x="6.5" y="18.5" width="6" height="6" rx="3" />
        <rect stroke={stroke} x="27.5" y="18.5" width="6" height="6" rx="3" />
        <rect stroke={stroke} x="27.5" y="8.5" width="6" height="6" rx="3" />
        <path
          stroke={stroke}
          d="M27.275 30.142l-14.83-7.233-.439.899 14.83 7.233z"
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

ManyToOne.defaultProps = {
  isSelected: false,
};

ManyToOne.propTypes = {
  isSelected: PropTypes.bool,
};

export default ManyToOne;
