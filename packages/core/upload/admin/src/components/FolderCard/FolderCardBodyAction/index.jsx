import React from 'react';

import { Box } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

const BoxOutline = styled(Box)`
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: -2px;
  }
`;

const BoxTextDecoration = styled(BoxOutline)`
  text-decoration: none;
`;

export const FolderCardBodyAction = ({ to, ...props }) => {
  if (to) {
    return (
      <BoxTextDecoration
        // padding needed to give outline space to appear
        // since FolderCardBody needs overflow hidden property
        padding={1}
        tag={NavLink}
        maxWidth="100%"
        to={to}
        {...props}
      />
    );
  }

  return <BoxOutline padding={1} tag="button" type="button" maxWidth="100%" {...props} />;
};

FolderCardBodyAction.defaultProps = {
  to: undefined,
};

FolderCardBodyAction.propTypes = {
  to: PropTypes.string,
};
