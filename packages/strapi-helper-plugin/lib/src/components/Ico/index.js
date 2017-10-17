import React from 'react';
import PropTypes from 'prop-types';

import styles from './styles.scss';

function Ico(props) {
  return (
    <div className={styles.ico} onClick={(e) => handleClick(e, props.onClick)}>
      <i className={`fa fa-${props.icoType}`} id={props.id} role="button" aria-hidden="true"/>
    </div>
  )
}

const handleClick = (e, onClick) => {
  e.preventDefault();
  e.stopPropagation();
  onClick();
}

Ico.proptypes = {
  icoType: PropTypes.string,
  onClick: PropTypes.func,
};

Ico.defaultProps = {
  icoType: 'trash',
  onClick: () => {},
};

export default Ico;
