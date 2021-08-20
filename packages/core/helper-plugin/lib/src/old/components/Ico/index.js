import React from 'react';
import PropTypes from 'prop-types';
import Div from './Div';

function Ico(props) {
  const iProps = Object.assign({}, props);
  const propsToDelete = ['onClick', 'icoType'];
  propsToDelete.map(value => delete iProps[value]);

  return (
    <Div onClick={e => handleClick(e, props.onClick)} id={props.id}>
      <i
        className={`fa fa-${props.icoType}`}
        id={props.id}
        role="button"
        aria-hidden="true"
        {...iProps}
      />
    </Div>
  );
}

const handleClick = (e, onClick) => {
  if (onClick) {
    e.preventDefault();
    e.stopPropagation();
    onClick(e);
  }
};

Ico.propTypes = {
  icoType: PropTypes.string,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onClick: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
};

Ico.defaultProps = {
  icoType: 'trash-alt',
  id: '',
  onClick: () => {},
};

export default Ico;
