/**
 *
 * WysiwygBottomControls
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import styles from './styles.scss';
/* eslint-disable jsx-a11y/label-has-for */
const WysiwygBottomControls = ({ isPreviewMode, onChange, onClick }) => {
  const browse = (
    <FormattedMessage id="components.WysiwygBottomControls.uploadFiles.browse">
      {(message) => <span className={styles.underline}>{message}</span>}
    </FormattedMessage>
  );

  return (
    <div className={styles.wysiwygBottomControlsWrapper}>
      <div>
        <label
          className={styles.dropLabel}
          onClick={(e) => {
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
      <div className={styles.fullScreenWrapper} onClick={onClick}>
        <FormattedMessage id="components.WysiwygBottomControls.fullscreen" />
      </div>
    </div>
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
