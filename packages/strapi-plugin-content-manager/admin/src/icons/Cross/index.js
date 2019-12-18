import React from 'react';
import PropTypes from 'prop-types';

const Cross = ({ fill, height, width, ...rest }) => {
  return (
    <svg
      {...rest}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.78 6.72L5.06 4l2.72-2.72a.748.748 0 0 0 0-1.06.748.748 0 0 0-1.06 0L4 2.94 1.28.22a.748.748 0 0 0-1.06 0 .748.748 0 0 0 0 1.06L2.94 4 .22 6.72a.748.748 0 0 0 0 1.06.748.748 0 0 0 1.06 0L4 5.06l2.72 2.72a.748.748 0 0 0 1.06 0 .752.752 0 0 0 0-1.06z"
        fill={fill}
        fillRule="evenodd"
      />
    </svg>
  );
};

Cross.defaultProps = {
  fill: '#b3b5b9',
  height: '8',
  width: '8',
};

Cross.propTypes = {
  fill: PropTypes.string,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

export default Cross;
