import React from 'react';
import PropTypes from 'prop-types';
import Cell from './Cell';

const CellRenderer = ({ icon, name, onChange, style, value }) => {
  const isSelected = icon === value;
  const handleClick = () => {
    onChange({ target: { name, value: icon } });
  };

  return (
    <Cell
      className="cell"
      style={style}
      isSelected={isSelected}
      onClick={handleClick}
    >
      <i className={`fa fa-${icon}`} />
    </Cell>
  );
};

CellRenderer.defaultProps = {
  value: '',
};

CellRenderer.propTypes = {
  icon: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  style: PropTypes.object.isRequired,
  value: PropTypes.string,
};

export default CellRenderer;
