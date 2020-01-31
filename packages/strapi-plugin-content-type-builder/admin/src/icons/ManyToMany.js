import React from 'react';
import PropTypes from 'prop-types';

const ManyToMany = ({ isSelected, ...rest }) => {
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
          d="M13.5 20.5h13v1h-13zM13.15 18.813l13.481-6.575.439.898-13.482 6.576z"
        />
        <rect stroke={stroke} x="27.5" y="17.5" width="6" height="6" rx="3" />
        <rect stroke={stroke} x="27.5" y="8.5" width="6" height="6" rx="3" />
        <path
          stroke={stroke}
          d="M26.85 28.813L13.37 22.238l-.439.898 13.482 6.576z"
        />
        <rect
          stroke={stroke}
          transform="matrix(-1 0 0 1 61 0)"
          x="27.5"
          y="26.5"
          width="6"
          height="6"
          rx="3"
        />
        <path
          stroke={stroke}
          d="M13.52 12.687l13.482 6.575.439-.898-13.482-6.576z"
        />
        <rect
          stroke={stroke}
          transform="matrix(1 0 0 -1 0 41)"
          x="6.871"
          y="17.5"
          width="6"
          height="6"
          rx="3"
        />
        <rect
          stroke={stroke}
          transform="matrix(1 0 0 -1 0 23)"
          x="6.871"
          y="8.5"
          width="6"
          height="6"
          rx="3"
        />
        <path
          stroke={stroke}
          d="M12.668 29.229l14.335-6.992.439.899-14.335 6.992z"
        />
        <rect
          stroke={stroke}
          transform="matrix(1 0 0 -1 0 59)"
          x="6.871"
          y="26.5"
          width="6"
          height="6"
          rx="3"
        />
      </g>
    </svg>
  );
};

ManyToMany.defaultProps = {
  isSelected: false,
};

ManyToMany.propTypes = {
  isSelected: PropTypes.bool,
};

export default ManyToMany;
