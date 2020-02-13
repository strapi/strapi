import React from 'react';
import PropTypes from 'prop-types';

const List = ({ data }) => {
  return <div>Coming soon {data.length} </div>;
};

List.defaultProps = {
  data: [],
};

List.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
};

export default List;
