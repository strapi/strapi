/**
 *
 * ListHeader
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';
import PropTypes from 'prop-types';

// import InputCheckBox from 'components/InputCheckbox';

import styles from './styles.scss';

function ListHeader({ changeSort, sort }) {
  const titles = [
    'hash',
    'name',
    'updated',
    'size',
    // 'related',
    '',
    '',
  ];

  const handleChangeSort = (name) => {
    if (sort === name) {
      changeSort(`-${name}`);
    } else if (sort === `-${name}`) {
      changeSort('hash');
    } else if (name === 'updated' || name === 'related') {
      changeSort('hash');
    } else {
      changeSort(name);
    }
  };

  const shouldDisplaySort = (title) => sort === title && styles.icon || sort === `-${title}` && styles.iconDesc || '';

  return (
    <li className={styles.listheaderWrapper}>
      <div className={cn(styles.listHeader)}>
        <div>
          <div />
          <div className={shouldDisplaySort('type')} onClick={() => handleChangeSort('type')}>
            <FormattedMessage id="upload.ListHeader.type" />
            <span />
          </div>
        </div>
        {titles.map((title, key) => {
          if (title !== '') {
            return (
              <div key={key} className={shouldDisplaySort(title)} onClick={() => handleChangeSort(title)}>
                <FormattedMessage id={`upload.ListHeader.${title}`} />
                <span />
              </div>
            );
          }

          return <div key={key} />;
        })}
      </div>
    </li>
  );
}

ListHeader.defaultProps = {
  changeSort: () => {},
};

ListHeader.propTypes = {
  changeSort: PropTypes.func,
  sort: PropTypes.string.isRequired,
};

export default ListHeader;
