import React from 'react';
import PropTypes from 'prop-types';

const Play = ({ fill, ...rest }) => (
  <svg width="48px" height="52px" viewBox="0 0 48 52" {...rest} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter
        x="-1.7%"
        y="-2.1%"
        width="103.5%"
        height="104.1%"
        filterUnits="objectBoundingBox"
        id="filter-1"
      >
        <feOffset dx="0" dy="2" in="SourceAlpha" result="shadowOffsetOuter1" />
        <feGaussianBlur stdDeviation="2" in="shadowOffsetOuter1" result="shadowBlurOuter1" />
        <feColorMatrix
          values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.05 0"
          type="matrix"
          in="shadowBlurOuter1"
          result="shadowMatrixOuter1"
        />
        <feMerge>
          <feMergeNode in="shadowMatrixOuter1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <g id="Prototype---Media-library" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
      <g
        id="Media-Library-/-Single-view-/-Media-Video"
        transform="translate(-545.000000, -435.000000)"
        fill={fill}
        fillRule="nonzero"
      >
        <g
          id="Modal---Upload-from-Unsplash"
          filter="url(#filter-1)"
          transform="translate(323.000000, 182.000000)"
        >
          <g id="Video" transform="translate(25.000000, 79.000000)">
            <g id="Group-17" transform="translate(169.000000, 151.000000)">
              <g id="play" transform="translate(32.000000, 25.000000)">
                <path
                  d="M39.3461265,22.97086 L1.5920398,43.9516702 C1.15612414,44.1980573 0.781805259,44.2264866 0.469083156,44.0369581 C0.156361052,43.8474295 0,43.5062781 0,43.0135039 L0,1.16560057 C0,0.672826344 0.156361052,0.331674959 0.469083156,0.142146411 C0.781805259,-0.0473821369 1.15612414,-0.0189528548 1.5920398,0.227434257 L39.3461265,21.2082445 C39.7820422,21.4546316 40,21.7484009 40,22.0895522 C40,22.4307036 39.7820422,22.7244729 39.3461265,22.97086 Z"
                  id="Path"
                />
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  </svg>
);

Play.defaultProps = {
  fill: '#fff',
};

Play.propTypes = {
  fill: PropTypes.string,
};

export default Play;
