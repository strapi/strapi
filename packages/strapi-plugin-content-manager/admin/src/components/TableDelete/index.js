/**
 *
 * TableDelete
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import styles from './styles.scss';

function TableDelete({ colspan, number, onToggleDeleteAll }) {
  const suffix = number > 1 ? 'plural' : 'singular';

  return (
    <tr className={styles.tableDelete}>
      <td colSpan={colspan + 1}>
        <FormattedMessage
          id={`content-manager.components.TableDelete.entries.${suffix}`}
          values={{ number }}
        >
          {message => <span className={styles.tableDeleteSpan}>{message}</span>}
        </FormattedMessage>
        <FormattedMessage
          id="content-manager.components.TableDelete.delete"
        >
          {message => <span className={styles.deleteAll} onClick={onToggleDeleteAll}>{message}</span>}
        </FormattedMessage>
      </td>
    </tr>
  );
}

TableDelete.defaultProps = {
  colspan: 0,
};

TableDelete.propTypes = {
  colspan: PropTypes.number,
  number: PropTypes.number.isRequired,
  onToggleDeleteAll: PropTypes.func.isRequired,
};

export default TableDelete;
