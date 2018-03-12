/**
 *
 * WysiwygBottomControls
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { FormattedMessage } from 'react-intl';

import styles from './styles.scss';

const WysiwygBottomControls = (props) => {
  return (
    <div className={styles.wysiwygBottomControlsWrapper}>
      <div><FormattedMessage id="components.WysiwygBottomControls.charactersIndicators" values={{ characters: props.charactersNumber }} /></div>
      <div className={styles.fullScreenWrapper}>
        <FormattedMessage id="components.WysiwygBottomControls.fullscreen" />
      </div>
    </div>
  );
}

WysiwygBottomControls.defaultProps = {
  charactersNumber: 0,
};

WysiwygBottomControls.propTypes = {
  charactersNumber: PropTypes.number,
};

export default WysiwygBottomControls;
