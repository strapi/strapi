/**
 *
 * ImgPreviewArrow
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import Wrapper from './Wrapper';

function ImgPreviewArrow(props) {
  let divStyle = props.show ? {} : { display: 'none' };

  if (props.enable) {
    divStyle = { zIndex: 99999 };
  }

  return (
    <Wrapper
      type={props.type}
      style={divStyle}
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        props.onClick(props.type);
      }}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    />
  );
}

ImgPreviewArrow.defaultProps = {
  enable: false,
  onClick: () => {},
  onMouseEnter: () => {},
  onMouseLeave: () => {},
  show: false,
  type: 'left',
};

ImgPreviewArrow.propTypes = {
  enable: PropTypes.bool,
  onClick: PropTypes.func,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
  show: PropTypes.bool,
  type: PropTypes.string,
};

export default ImgPreviewArrow;
