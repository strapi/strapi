import React from 'react';

const DoubleFile = props => {
  return (
    <svg width="21" height="21" xmlns="http://www.w3.org/2000/svg" {...props}>
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
      <g transform="translate(-443 -195)" fill="#EEE" fillRule="nonzero">
        <path d="M458.781 197h-8.125c-.673 0-1.219.546-1.219 1.219v1.219h-1.218c-.673 0-1.219.545-1.219 1.218v8.125c0 .673.546 1.219 1.219 1.219h8.125c.673 0 1.219-.546 1.219-1.219v-1.219h1.218c.673 0 1.219-.545 1.219-1.218v-8.125c0-.673-.546-1.219-1.219-1.219zm-2.59 11.781h-7.82a.152.152 0 01-.152-.152v-7.82c0-.085.068-.153.152-.153h1.067v5.688c0 .673.545 1.219 1.218 1.219h5.688v1.066a.152.152 0 01-.153.152zm2.438-2.437h-7.82a.152.152 0 01-.153-.153v-7.82c0-.084.068-.152.153-.152h7.82c.084 0 .152.068.152.152v7.82a.152.152 0 01-.152.153z" />
      </g>
    </svg>
  );
};

export default DoubleFile;
