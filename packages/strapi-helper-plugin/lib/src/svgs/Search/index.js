import React from 'react';
import PropTypes from 'prop-types';

const Search = ({ fill, height, width, ...rest }) => {
  return (
    <svg
      {...rest}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15.875 13.446l-3.533-3.58a6.531 6.531 0 00.875-3.245C13.217 2.97 10.25 0 6.608 0 2.967 0 0 2.97 0 6.62s2.967 6.622 6.608 6.622c1.163 0 2.313-.321 3.338-.934l3.517 3.567a.422.422 0 00.608 0l1.804-1.825a.428.428 0 000-.604zM6.608 2.579a4.041 4.041 0 014.034 4.042 4.041 4.041 0 01-4.034 4.042A4.041 4.041 0 012.575 6.62a4.041 4.041 0 014.033-4.042z"
        fill={fill}
        fillRule="evenodd"
      />
    </svg>
  );
};

Search.defaultProps = {
  fill: '#b3b5b9',
  height: '16',
  width: '16',
};

Search.propTypes = {
  fill: PropTypes.string,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

export default Search;
