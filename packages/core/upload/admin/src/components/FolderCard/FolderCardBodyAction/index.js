import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';

const FolderCardLink = styled(NavLink)`
  max-width: 100%;
  text-decoration: none;
`;

export const FolderCardBodyAction = ({ to, ...props }) => {
  if (to) {
    return <FolderCardLink to={to} {...props} />;
  }

  return <button type="button" {...props} />;
};

FolderCardBodyAction.defaultProps = {
  to: undefined,
};

FolderCardBodyAction.propTypes = {
  to: PropTypes.string,
};
