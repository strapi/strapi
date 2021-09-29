import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Row } from '@strapi/parts/Row';
import { TableLabel } from '@strapi/parts/Text';

const Wrapper = styled(Row)`
  position: relative;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  background: ${({ theme }) => theme.colors.neutral150};
  padding-left: 1px;

  span {
    line-height: 0.6rem;
    font-size: 0.6rem;
  }
`;

const FileWrapper = ({ children, ...props }) => {
  return (
    <Wrapper justifyContent="center" alignItems="center" as="span" {...props}>
      <TableLabel textColor="neutral600">{children}</TableLabel>
    </Wrapper>
  );
};

FileWrapper.propTypes = {
  children: PropTypes.string.isRequired,
};

export default FileWrapper;
