/**
 *
 * EntriesNumber
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

function EntriesNumber({ number }) {
  const id = number > 1 ? 'number.plural' : 'number';

  return (
    <div style={{ color: '#787E8F', fontSize: '13px' }}>
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
