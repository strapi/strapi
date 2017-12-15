/**
*
* InputSearchLi
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import styles from './styles.scss';

function InputSearchLi({ onClick, isAdding, item }) {
  const icon = isAdding ? 'fa-plus' : 'fa-minus-circle';
  const liStyle = isAdding ? { cursor: 'pointer' } : {};
  const handleClick = isAdding ? () => onClick(item) : () => {};
  const path = `/admin/plugins/content-manager/user/${item.id}?redirectUrl=/plugins/content-manager/user/?page=1&limit=20&sort=id&source=users-permissions`;

  return (
    <li className={styles.li} style={liStyle} onClick={handleClick}>
      <div>
        <div className={styles.container}>
          {item.username}
          <a href={`${path}`} target="_blank">
            <i className="fa fa-external-link" />
          </a>
        </div>
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onClick(item);
          }}
        >
          <i className={`fa ${icon}`} />
        </div>
      </div>
    </li>
  );
}

InputSearchLi.defaultProps = {
  item: {
    name: '',
  },
};

InputSearchLi.propTypes = {
  isAdding: PropTypes.bool.isRequired,
  item: PropTypes.object,
  onClick: PropTypes.func.isRequired,
};

export default InputSearchLi;
