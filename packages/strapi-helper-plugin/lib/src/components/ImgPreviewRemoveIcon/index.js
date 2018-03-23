/**
 *
 * ImgPreviewRemoveIcon
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import styles from './styles.scss';

function ImgPreviewRemoveIcon(props) {
  const divStyle = props.show ? {} : { display: 'none' };

  return (
    <div className={styles.iconContainer} onClick={props.onClick} style={divStyle}>
      <i className="fa fa-times" />
    </div>
  );
}

ImgPreviewRemoveIcon.defaultProps = {
  onClick: () => {},
  show: false,
};

ImgPreviewRemoveIcon.propTypes = {
  onClick: PropTypes.func,
  show: PropTypes.bool,
};

export default ImgPreviewRemoveIcon;
