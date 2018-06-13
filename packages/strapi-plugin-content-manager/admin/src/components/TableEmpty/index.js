/**
 *
 * TableRow
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { upperFirst } from 'lodash';

import styles from './styles.scss';

function TableEmpty({ colspan, contentType, filters, search }) {
  let id, values;
  const model = upperFirst(contentType);

  if (search !== '') {
    id = 'withSearch';
    values = { contentType: model, search };
  } else {
    id = filters.length > 0 ? 'withFilters' : 'withoutFilter';
    values = { contentType: model || 'entry' };
  }

  return (
    <tr className={styles.tableEmpty}>
      <td colSpan={colspan + 1}>
        <FormattedMessage id={`content-manager.components.TableEmpty.${id}`} values={values} />
      </td>
    </tr>
  );
}

TableEmpty.defaultProps = {
  search: '',
};

TableEmpty.propTypes = {
  colspan: PropTypes.number.isRequired,
  contentType: PropTypes.string.isRequired,
  filters: PropTypes.array.isRequired,
  search: PropTypes.string,
};

export default TableEmpty;
