import React from 'react';

const Striked = () => {
  return (
    <svg width="19" height="10" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd">
        <text
          fontFamily="Lato-Semibold, Lato"
          fontSize="11"
          fontWeight="500"
          fill="#41464E"
          transform="translate(0 -2)"
        >
          <tspan x="1" y="11">
            abc
          </tspan>
        </text>
        <path d="M.5 6.5h18" stroke="#2C3039" strokeLinecap="square" />
      </g>
    </svg>
  );
};

export default Striked;
