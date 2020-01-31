/**
 *
 * WysiwygBottomControls
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Span, Wrapper } from './components';

/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/no-static-element-interactions */

const WysiwygBottomControls = ({ isPreviewMode, onChange, onClick }) => {
  const browse = (
    <FormattedMessage id="components.WysiwygBottomControls.uploadFiles.browse">
      {message => <Span>{message}</Span>}
    </FormattedMessage>
  );

  return (
    <Wrapper>
      <div>
        <label
          className="dropLabel"
          onClick={e => {
            if (isPreviewMode) {
              e.preventDefault();
            }
          }}
        >
          <FormattedMessage
            id="components.WysiwygBottomControls.uploadFiles"
            values={{ browse }}
          />
          <input type="file" onChange={onChange} />
        </label>
      </div>
      <div className="fullScreenWrapper" onClick={onClick}>
        <FormattedMessage id="components.WysiwygBottomControls.fullscreen" />
      </div>
    </Wrapper>
  );
};

WysiwygBottomControls.defaultProps = {
  isPreviewMode: false,
  onChange: () => {},
  onClick: () => {},
};

WysiwygBottomControls.propTypes = {
  isPreviewMode: PropTypes.bool,
  onChange: PropTypes.func,
  onClick: PropTypes.func,
};

export default WysiwygBottomControls;
