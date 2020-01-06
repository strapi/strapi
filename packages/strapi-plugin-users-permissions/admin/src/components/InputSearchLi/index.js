/**
 *
 * InputSearchLi
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import { Wrapper } from './Components';

function InputSearchLi({ onClick, isAdding, item }) {
  const { id, username } = item;
  const icon = isAdding ? 'fa-plus' : 'fa-minus-circle';
  const liStyle = isAdding ? { cursor: 'pointer' } : {};
  const handleClick = isAdding ? () => onClick(item) : () => {};
  const path = `/admin/plugins/content-manager/user/${id}?redirectUrl=/plugins/content-manager/user/?page=1&limit=20&sort=id&source=users-permissions`;

  return (
    <Wrapper style={liStyle} onClick={handleClick}>
      <div>
        <div>
          {username}
          <a href={`${path}`} target="_blank" rel="noopener noreferrer">
            <i className="fa fa-external-link-alt" />
          </a>
        </div>
        <div
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            onClick(item);
          }}
        >
          <i className={`fa ${icon}`} />
        </div>
      </div>
    </Wrapper>
  );
}

InputSearchLi.defaultProps = {
  item: {
    id: null,
    username: null,
  },
};

InputSearchLi.propTypes = {
  isAdding: PropTypes.bool.isRequired,
  item: PropTypes.object,
  onClick: PropTypes.func.isRequired,
};

export default InputSearchLi;
