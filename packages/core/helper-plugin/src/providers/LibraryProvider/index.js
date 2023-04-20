/**
 *
 * LibraryProvider
 *
 */
import React from 'react';
import PropTypes from 'prop-types';
import LibraryContext from '../../contexts/LibraryContext';

const LibraryProvider = ({ children, ...value }) => {
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
};

LibraryProvider.propTypes = {
  children: PropTypes.node.isRequired,
  components: PropTypes.object.isRequired,
  fields: PropTypes.object.isRequired,
};

export default LibraryProvider;
