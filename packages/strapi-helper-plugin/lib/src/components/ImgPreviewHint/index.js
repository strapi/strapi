/**
 *
 * ImgPreviewHint
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import styles from './styles.scss';

function ImgPreviewHint(props) {

  let pStyle;

  switch (true) {
    case props.showWhiteHint:
      pStyle = { zIndex: 999, color: '#fff' };
      break;
    case props.displayHint:
      pStyle = { zIndex: 4 };
      break;
    default:
      pStyle = { display: 'none' };
  }

  return (
    <p className={styles.imgPreviewHint} style={pStyle} onDragEnter={(e) => e.stopPropagation()}>
      <FormattedMessage
        id="app.components.ImgPreview.hint"
        values={{
          browse: <FormattedMessage id="app.components.ImgPreview.hint.browse">{(message) => <u>{message}</u>}</FormattedMessage>
        }}
      />
    </p>
  );
}

ImgPreviewHint.defaultProps = {
  displayHint: false,
  showWhiteHint: false,
};

ImgPreviewHint.propTypes = {
  displayHint: PropTypes.bool,
  showWhiteHint: PropTypes.bool,
};

export default ImgPreviewHint;
