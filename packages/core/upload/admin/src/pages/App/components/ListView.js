import React from 'react';
import PropTypes from 'prop-types';

// TODO: implement the view
export const ListView = ({ assets }) => {
  return <div>Number of assets: {assets.length}</div>;
};

ListView.propTypes = {
  assets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
