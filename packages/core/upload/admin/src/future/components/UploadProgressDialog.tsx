import * as React from 'react';

import { Box, Flex, Typography, IconButton } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { useSelector, useDispatch } from 'react-redux';
import { styled } from 'styled-components';

import { closeUploadProgress, UploadProgressState } from '../store/uploadProgress';

interface RootState {
  uploadProgress: UploadProgressState;
}

const DialogContainer = styled(Box)`
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 360px;
  max-height: 400px;
  background: ${({ theme }) => theme.colors.neutral0};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.popupShadow};
  z-index: 1000;
  overflow: hidden;
`;

const Header = styled(Flex)`
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const Content = styled(Box)`
  padding: 16px;
`;

export const UploadProgressDialog = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state: RootState) => state.uploadProgress.isOpen);

  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    dispatch(closeUploadProgress());
  };

  return (
    <DialogContainer>
      <Header justifyContent="space-between" alignItems="center">
        <Typography variant="sigma" textColor="neutral600">
          Upload Progress
        </Typography>
        <IconButton onClick={handleClose} label="Close" variant="ghost">
          <Cross />
        </IconButton>
      </Header>
      <Content>
        <Typography variant="omega" textColor="neutral600">
          Upload content will be managed by the component
        </Typography>
      </Content>
    </DialogContainer>
  );
};
