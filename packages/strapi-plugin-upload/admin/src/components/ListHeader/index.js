/**
 *
 * ListHeader
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

// import InputCheckBox from 'components/InputCheckbox';

import styles from './styles.scss';

function ListHeader() {
  const titles = [
    '',
    'type',
    'hash',
    'name',
    'updated',
    'size',
    'related',
    '',
  ];
  return (
    <li className={styles.listheaderWrapper}>
      <div className={cn(styles.listHeader)}>
        {titles.map((title, key) => {
          if (title !== '') {
            return (
              <div key={key}>
                <FormattedMessage id={`upload.ListHeader.${title}`} />
              </div>
            );
          }

          return <div key={key} />;
        })}
      </div>
    </li>
  );
}

export default ListHeader;
