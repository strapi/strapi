/**
 *
 * ListHeader
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

import StyledLi from './StyledLi';

/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable react/no-array-index-key */

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
    if (sort === `${name}:ASC`) {
      changeSort(`${name}:DESC`);
    } else if (sort === `${name}:DESC`) {
      changeSort('hash:ASC');
    } else if (name === 'updated' || name === 'related') {
      changeSort('hash:ASC');
    } else {
      changeSort(`${name}:ASC`);
    }
  };

  const shouldDisplaySort = title =>
    (sort === `${title}:ASC` && 'icon') ||
    (sort === `${title}:DESC` && 'iconDesc') ||
    '';

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
