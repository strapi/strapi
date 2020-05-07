import React from 'react';

const Cloud = props => {
  return (
    <svg width="53" height="42" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <filter
          x="-1.7%"
          y="-3.1%"
          width="103.5%"
          height="106.2%"
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
      <g filter="url(#a)" transform="translate(-434 -135)" fill="#E9EAEB" fillRule="nonzero">
        <path d="M467.222 156.644a.559.559 0 00-.158-.41l-6.187-6.27a.544.544 0 00-.405-.16.544.544 0 00-.404.16l-6.17 6.252a.674.674 0 00-.176.428.544.544 0 00.563.57h3.937v6.27c0 .154.056.288.167.4.112.113.244.17.396.17h3.375a.537.537 0 00.395-.17.551.551 0 00.167-.4v-6.27h3.938a.537.537 0 00.395-.17.551.551 0 00.167-.4zM483 161.156c0 2.5-.879 4.635-2.637 6.404-1.758 1.77-3.879 2.654-6.363 2.654h-25.5c-2.89 0-5.363-1.034-7.418-3.102-2.055-2.068-3.082-4.557-3.082-7.466 0-2.044.547-3.932 1.64-5.661a10.28 10.28 0 014.407-3.893c-.031-.472-.047-.81-.047-1.014 0-3.334 1.172-6.18 3.516-8.54C449.859 138.18 452.687 137 456 137c2.438 0 4.668.684 6.691 2.052a11.817 11.817 0 014.418 5.45c1.11-.976 2.407-1.463 3.891-1.463 1.656 0 3.07.59 4.242 1.77 1.172 1.179 1.758 2.602 1.758 4.269 0 1.195-.32 2.28-.96 3.255 2.03.488 3.698 1.553 5.003 3.197 1.305 1.643 1.957 3.518 1.957 5.626z" />
      </g>
    </svg>
  );
};

export default Cloud;
