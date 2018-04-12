/**
 *
 *
 * PreviewControl
 *
 */
import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import styles from './componentsStyles.scss';

const PreviewControl = ({ onClick }) => (
  <div className={styles.previewControlsWrapper} onClick={onClick}>
    <div />
    <div className={styles.wysiwygCollapse}>
      <FormattedMessage id="components.Wysiwyg.collapse" />
    </div>
  </div>
);

PreviewControl.defaultProps = {
  onClick: () => {},
};

PreviewControl.propTypes = {
  onClick: PropTypes.func,
};

export default PreviewControl;
