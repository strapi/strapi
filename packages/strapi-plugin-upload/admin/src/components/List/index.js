import React from 'react';
import PropTypes from 'prop-types';

import Card from '../Card';

const List = ({ data }) => {
  return (
    <div className="row">
      <div className="col-xs-12 col-md-6 col-lg-4 col-xl-3">
        <Card isSmall />
      </div>
      <div className="col-xs-12 col-md-6 col-lg-4 col-xl-3">
        <Card isSmall />
      </div>
      <div className="col-xs-12 col-md-6 col-lg-4 col-xl-3">
        <Card isSmall />
      </div>
      <div className="col-xs-12 col-md-6 col-lg-4 col-xl-3">
        <Card isSmall />
      </div>
    </div>
  );
};

List.defaultProps = {
  data: [],
};

List.propTypes = {
  data: PropTypes.array,
};

export default List;
