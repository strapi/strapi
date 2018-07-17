/**
 * 
 * TableLoading
 */
import React from 'react';
import PropTypes from 'prop-types';
import LoadingIndicator from 'components/LoadingIndicator';

import styles from './styles.scss';

function TableLoading({ colspan }) {
  return (
    <tr className={styles.tableLoading}>
      <td colSpan={colspan + 1}>
        <LoadingIndicator />
      </td>
    </tr>
  );
}


TableLoading.propTypes = {
  colspan: PropTypes.number.isRequired,
};

export default TableLoading;