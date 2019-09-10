/**
 *
 * ListHeader
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

import StyledLi from './StyledLi';

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

  const handleChangeSort = name => {
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

  const shouldDisplaySort = title =>
    (sort === title && 'icon') || (sort === `-${title}` && 'iconDesc') || '';

  return (
    <StyledLi>
      <div className="listHeader">
        <div>
          <div />
          <div
            className={shouldDisplaySort('type')}
            onClick={() => handleChangeSort('type')}
          >
            <FormattedMessage id="upload.ListHeader.type" />
            <span />
          </div>
        </div>
        {titles.map((title, key) => {
          if (title !== '') {
            return (
              <div
                key={key}
                className={shouldDisplaySort(title)}
                onClick={() => handleChangeSort(title)}
              >
                <FormattedMessage id={`upload.ListHeader.${title}`} />
                <span />
              </div>
            );
          }

          return <div key={key} />;
        })}
      </div>
    </StyledLi>
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
