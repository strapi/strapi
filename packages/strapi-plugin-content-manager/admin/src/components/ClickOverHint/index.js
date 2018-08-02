/**
 * 
 * ClickOverHint
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import styles from './styles.scss';

function ClickOverHint({ show }) {
  if (show) {
    return (
      <div className={styles.clickOverHint}>
        <FormattedMessage id="content-manager.components.DraggableAttr.edit" />
      </div>
    );
  }

  return null;
}

ClickOverHint.propTypes = {
  show: PropTypes.bool.isRequired,
};

export default ClickOverHint;