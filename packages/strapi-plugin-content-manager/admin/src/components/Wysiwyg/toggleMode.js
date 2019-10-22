/**
 *
 *
 * ToggleMode
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import ToggleModeWrapper from './ToggleModeWrapper';

const ToggleMode = props => {
  const label = props.isPreviewMode
    ? 'components.Wysiwyg.ToggleMode.markdown'
    : 'components.Wysiwyg.ToggleMode.preview';

  return (
    <ToggleModeWrapper>
      <FormattedMessage id={label}>
        {msg => (
          <button
            type="button"
            className="toggleModeButton"
            onClick={props.onClick}
          >
            {msg}
          </button>
        )}
      </FormattedMessage>
    </ToggleModeWrapper>
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

export default ToggleMode;
