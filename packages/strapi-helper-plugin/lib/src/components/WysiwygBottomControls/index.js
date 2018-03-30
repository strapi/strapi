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
      {(message) => {

        if (isPreviewMode) {
          return <span className={styles.underline}>{message}</span>;
        }

        return (
          <label className={styles.dropLabel}>
            <span className={styles.underline}>{message}</span>
            <input
              type="file"
              onChange={onChange}
            />
          </label>
        );
      }}
    </FormattedMessage>
  );

  return (
    <div className={styles.wysiwygBottomControlsWrapper}>
      <div>
        <FormattedMessage
          id="components.WysiwygBottomControls.uploadFiles"
          values={{ browse }}
        />
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
