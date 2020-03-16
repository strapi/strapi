/**
 *
 * ImgPreviewHint
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import P from './P';
/* eslint-disable */

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

  const browse = (
    <FormattedMessage id="app.components.ImgPreview.hint.browse">
      {message => <u onClick={props.onClick}>{message}</u>}
    </FormattedMessage>
  );

  return (
    <P style={pStyle} onDragEnter={e => e.stopPropagation()} onDrop={props.onDrop}>
      <FormattedMessage id="app.components.ImgPreview.hint" values={{ browse }} />
    </P>
  );
}

ImgPreviewHint.defaultProps = {
  displayHint: false,
  onClick: () => {},
  onDrop: () => {},
  showWhiteHint: false,
};

ImgPreviewHint.propTypes = {
  displayHint: PropTypes.bool,
  onClick: PropTypes.func,
  onDrop: PropTypes.func,
  showWhiteHint: PropTypes.bool,
};

export default ImgPreviewHint;
