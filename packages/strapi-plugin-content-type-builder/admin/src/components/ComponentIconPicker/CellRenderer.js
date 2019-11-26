import React from 'react';
import PropTypes from 'prop-types';
import icons from './utils/icons';

const CellRenderer = ({ index, key, style }) => {
  return (
    <div className="cell" key={key} style={style}>
      <i className={`fa fa-${icons[index]}`} />
    </div>
  );
};

CellRenderer.propTypes = {
  key: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  style: PropTypes.object.isRequired,
};

export default CellRenderer;
