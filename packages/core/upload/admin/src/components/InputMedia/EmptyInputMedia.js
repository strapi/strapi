import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { getTrad } from '../../utils';
import IconUpload from './IconUpload';

const EmptyInputMediaWrapper = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  background-color: ${({ theme, isInDropZone }) =>
    isInDropZone ? '#515764' : theme.main.colors.black};
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};

  & * {
    pointer-events: none;
  }
`;

const EmptyInputMedia = ({ children, ...props }) => {
  const { formatMessage } = useIntl();

  const [isInDropZone, setIsInDropZone] = useState(false);

  const handleDragEnter = () => setIsInDropZone(true);
  const handleResetDropZone = () => setIsInDropZone(false);

  const titleSvgTranslate = formatMessage({ id: getTrad('input.placeholder.icon') });

  return (
    <EmptyInputMediaWrapper
      {...props}
      onDragEnter={handleDragEnter}
      onDragLeave={handleResetDropZone}
      onDrop={handleResetDropZone}
      isInDropZone={isInDropZone}
    >
      <IconUpload title={titleSvgTranslate} />
      {isInDropZone ? null : children}
    </EmptyInputMediaWrapper>
  );
};

EmptyInputMedia.propTypes = {
  disabled: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

EmptyInputMedia.defaultProps = {
  disabled: false,
};

export default EmptyInputMedia;
