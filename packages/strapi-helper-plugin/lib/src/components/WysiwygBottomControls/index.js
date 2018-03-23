/**
 *
 * WysiwygBottomControls
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import styles from './styles.scss';

const WysiwygBottomControls = ({ charactersNumber }) => {
  return (
    <div className={styles.wysiwygBottomControlsWrapper}>
      <div><FormattedMessage id="components.WysiwygBottomControls.charactersIndicators" values={{ characters: charactersNumber }} /></div>
      {/*}<div className={styles.fullScreenWrapper} onClick={onClick}>
        <FormattedMessage id="components.WysiwygBottomControls.fullscreen" />
      </div>
      */}
    </div>
  );
};

WysiwygBottomControls.defaultProps = {
  charactersNumber: 0,
  // onClick: () => {},
};

WysiwygBottomControls.propTypes = {
  charactersNumber: PropTypes.number,
  // onClick: PropTypes.func,
};

export default WysiwygBottomControls;
