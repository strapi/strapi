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

const PreviewControl = ({ characters, onClick }) => (
  <div className={styles.previewControlsWrapper} onClick={onClick}>
    <div>
      <span>{characters}&nbsp;</span>
      <FormattedMessage
        id="components.WysiwygBottomControls.charactersIndicators"
      />
    </div>
    <div className={styles.wysiwygCollapse}>
      <FormattedMessage id="components.Wysiwyg.collapse" />
    </div>
  </div>
);

PreviewControl.defaultProps = {
  characters: 0,
  onClick: () => {},
};

PreviewControl.propTypes = {
  characters: PropTypes.number,
  onClick: PropTypes.func,
};

export default PreviewControl;
