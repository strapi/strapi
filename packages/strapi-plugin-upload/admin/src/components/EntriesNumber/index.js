/**
 *
 * EntriesNumber
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import styles from './styles.scss';

function EntriesNumber({ number }) {
  const id = number > 1 ? 'number.plural' : 'number';

  return (
    <div className={styles.entriesNumberContainer}>
      <FormattedMessage id={`upload.EntriesNumber.${id}`} values={{ number }} />
    </div>
  );
}

EntriesNumber.defaultProps = {
  number: 0,
};

EntriesNumber.propTypes = {
  number: PropTypes.number,
};

export default EntriesNumber;
