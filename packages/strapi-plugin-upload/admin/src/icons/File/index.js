import React from 'react';

const File = props => {
  return (
    <svg width="21" height="25" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <filter
          x="-1.7%"
          y="-2.1%"
          width="103.5%"
          height="104.1%"
          filterUnits="objectBoundingBox"
          id="a"
        >
          <feOffset dy="2" in="SourceAlpha" result="shadowOffsetOuter1" />
          <feGaussianBlur stdDeviation="2" in="shadowOffsetOuter1" result="shadowBlurOuter1" />
          <feColorMatrix
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"
            in="shadowBlurOuter1"
            result="shadowMatrixOuter1"
          />
          <feMerge>
            <feMergeNode in="shadowMatrixOuter1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g transform="translate(-443 -147)" fill="#EEE">
        <path d="M459.186 152.258l-2.764-2.764a1.581 1.581 0 00-1.117-.464h-6.724a1.587 1.587 0 00-1.581 1.584v13.705c0 .873.708 1.581 1.581 1.581h9.488c.873 0 1.581-.708 1.581-1.581v-10.94c0-.42-.168-.824-.464-1.12zm-1.245.992h-2.507v-2.507l2.507 2.507zm-9.36 11.069v-13.705h5.271v3.426a.79.79 0 00.79.791h3.427v9.488h-9.488z" />
      </g>
    </svg>
  );
};

export default File;
