/**
 *
 * StrapiProvider
 *
 */
import React from 'react';
import PropTypes from 'prop-types';
import StrapiContext from '../../contexts/StrapiContext';

const StrapiProvider = ({ children, strapi }) => {
  return <StrapiContext.Provider value={{ strapi }}>{children}</StrapiContext.Provider>;
};

StrapiProvider.defaultProps = {};
StrapiProvider.propTypes = {
  children: PropTypes.node.isRequired,
  strapi: PropTypes.object.isRequired,
};

export default StrapiProvider;
