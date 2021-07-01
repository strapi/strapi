/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/**
 *
 * WysiwygBottomControls
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Wrapper } from './components';

const WysiwygBottomControls = ({ onClick }) => {
  return (
    <Wrapper>
      <div />
      <div className="fullScreenWrapper" onClick={onClick}>
        <FormattedMessage id="components.WysiwygBottomControls.fullscreen" />
      </div>
    </Wrapper>
  );
};

WysiwygBottomControls.defaultProps = {
  onClick: () => {},
};

WysiwygBottomControls.propTypes = {
  onClick: PropTypes.func,
};

export default WysiwygBottomControls;
