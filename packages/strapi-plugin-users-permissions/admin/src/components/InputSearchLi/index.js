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

  return (
    <li className={styles.li}>
      <div>
        <div>
          {item.username}
        </div>
        <div onClick={() => onClick(item)}>
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
