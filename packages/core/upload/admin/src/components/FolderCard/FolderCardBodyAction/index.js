import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';

const BoxTextDecoration = styled(Box)`
  text-decoration: none;
`;

export const FolderCardBodyAction = ({ to, ...props }) => {
  if (to) {
    return <BoxTextDecoration as={NavLink} maxWidth="100%" to={to} {...props} />;
  }

  return <Box as="button" type="button" maxWidth="100%" {...props} />;
};

FolderCardBodyAction.defaultProps = {
  to: undefined,
};

FolderCardBodyAction.propTypes = {
  to: PropTypes.string,
};
