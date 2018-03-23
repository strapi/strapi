/**
 *
 * Utils components for the WYSIWYG
 * It includes decorators toggle buttons...
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import styles from './styles.scss';

const ToggleMode = (props) => {
  const label = props.isPreviewMode ? 'components.Wysiwyg.ToggleMode.markdown' : 'components.Wysiwyg.ToggleMode.preview';

  return (
    <button type="button" className={styles.toggleModeButton} onClick={props.onClick}>
      <FormattedMessage id={label} />
    </button>
  );
};

ToggleMode.defaultProps = {
  isPreviewMode: false,
  onClick: () => {},
};

ToggleMode.propTypes = {
  isPreviewMode: PropTypes.bool,
  onClick: PropTypes.func,
};

export {
  ToggleMode,
};
