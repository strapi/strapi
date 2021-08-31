import React from 'react';

const Download = props => {
  return (
    <svg width="16" height="17" xmlns="http://www.w3.org/2000/svg" {...props}>
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
      <g transform="translate(-353 -96)" fill="#9EA7B8">
        <path d="M365.233 105.183a.26.26 0 01-.083.189l-3.844 3.833a.261.261 0 01-.38 0l-3.844-3.833a.26.26 0 01-.082-.19.26.26 0 01.082-.188l.413-.412a.261.261 0 01.38 0l3.241 3.233 3.242-3.233a.261.261 0 01.38 0l.412.412a.26.26 0 01.083.189z" />
        <path d="M361.503 107.917l-.711-.053a.215.215 0 01-.15-.053.174.174 0 01-.059-.136v-9.153c0-.055.02-.1.059-.136a.215.215 0 01.15-.053h.711c.061 0 .111.018.15.053.04.036.059.08.059.136v9.206c0 .055-.02.1-.059.136a.215.215 0 01-.15.053zM357 110.815l.044-.63c0-.054.015-.098.044-.133a.142.142 0 01.113-.052h7.642c.046 0 .083.017.113.052.03.035.044.079.044.133v.63a.198.198 0 01-.044.133.142.142 0 01-.113.052h-7.686a.142.142 0 01-.113-.052.198.198 0 01-.044-.133z" />
      </g>
    </svg>
  );
};

export default Download;
