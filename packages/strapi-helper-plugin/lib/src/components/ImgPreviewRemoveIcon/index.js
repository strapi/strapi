/**
 *
 * ImgPreviewRemoveIcon
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Div from './Div';

function ImgPreviewRemoveIcon(props) {
  const divStyle = props.show ? {} : { display: 'none' };

  return (
    <Div onClick={props.onClick} style={divStyle}>
      {/* <i className="fa fa-times" /> */}
      <FontAwesomeIcon icon="times" />
    </Div>
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
