/**
 *
 * ImgPreviewArrow
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import styles from './styles.scss';

function ImgPreviewArrow(props) {
  const divStyle = props.show ? {} : { display: 'none' };
  return (
    <div
      className={cn(
        styles.arrowContainer,
        props.type === 'left' && styles.arrowLeft,
        props.type !== 'left' && styles.arrowRight,
      )}
      style={divStyle}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        props.onClick(props.type);
      }}
    />
  )
}

ImgPreviewArrow.defaultProps = {
  onClick: () => {},
  show: false,
  type: 'left',
};

ImgPreviewArrow.propTypes = {
  onClick: PropTypes.func,
  show: PropTypes.bool,
  type: PropTypes.string,
};

export default ImgPreviewArrow;
