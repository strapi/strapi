/**
*
* InputSearchLi
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import styles from './styles.scss';

function InputSearchLi({ item, onClickDelete }) {
  return (
    <li className={styles.li}>
      <div>
        <div>
          {item.name}
        </div>
        <div onClick={() => onClickDelete(item)}>
          <i className="fa fa-minus-circle" />
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
  item: PropTypes.object,
  onClickDelete: PropTypes.func.isRequired,
};

export default InputSearchLi;
