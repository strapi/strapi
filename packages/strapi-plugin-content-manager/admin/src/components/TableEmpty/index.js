/**
 *
 * TableRow
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import styles from './styles.scss';

function TableEmpty({ colspan, contentType, filters }) {
  const id = filters.length > 0 ? 'withFilters' : 'withoutFilter';

  return (
    <tr className={styles.tableEmpty}>
      <td colSpan={colspan + 1}>
        <FormattedMessage id={`content-manager.components.TableEmpty.${id}`} values={{ contentType: contentType || 'entry' }} />
      </td>
    </tr>
  );
}


TableEmpty.propTypes = {
  colspan: PropTypes.number.isRequired,
  contentType: PropTypes.string.isRequired,
  filters: PropTypes.array.isRequired,
};

export default TableEmpty;
