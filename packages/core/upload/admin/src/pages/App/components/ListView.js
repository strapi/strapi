import React from 'react';
import PropTypes from 'prop-types';

export const ListView = ({ assets }) => {
  console.log('lol', assets);

  return <div>Hello world</div>;
};

ListView.propTypes = {
  assets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
