import React, { useState } from 'react';
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
  z-index: ${({ hovering }) => (hovering ? 1 : undefined)};

  span {
    line-height: 0.6rem;
    font-size: 0.6rem;
  }
`;

const FileWrapper = ({ children, preview }) => {
  const [previewVisible, setPreviewVisible] = useState(false);

  return (
    <Wrapper
      justifyContent="center"
      alignItems="center"
      hovering={preview && previewVisible}
      onMouseEnter={() => setPreviewVisible(true)}
      onMouseLeave={() => setPreviewVisible(false)}
    >
      <TableLabel textColor="neutral600">{children}</TableLabel>
    </Wrapper>
  );
};

FileWrapper.defaultProps = {
  preview: true,
};

FileWrapper.propTypes = {
  children: PropTypes.string.isRequired,
  preview: PropTypes.bool,
};

export default FileWrapper;
