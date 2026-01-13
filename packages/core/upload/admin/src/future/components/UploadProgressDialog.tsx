import * as React from 'react';

import { Button, Flex, Modal, ProgressBar, Typography } from '@strapi/design-system';
import { Upload } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTrad } from '../../utils';

const IconWrapper = styled.div`
  font-size: 3rem;

  svg path {
    fill: ${({ theme }) => theme.colors.primary600};
  }
`;

const ProgressSection = styled(Flex)`
  width: 100%;
`;

interface UploadProgressDialogProps {
  open: boolean;
  progress: number;
  onCancel: () => void;
}

export const UploadProgressDialog = ({ open, progress, onCancel }: UploadProgressDialogProps) => {
  const { formatMessage } = useIntl();

  return (
    <Modal.Root open={open} onOpenChange={onCancel}>
      <Modal.Content>
        <Modal.Header>
          <Flex gap={2} alignItems="center">
            <IconWrapper>
              <Upload aria-hidden width="2.4rem" height="2.4rem" />
            </IconWrapper>
            <Modal.Title>
              {formatMessage({
                id: getTrad('upload.progress.uploading'),
                defaultMessage: 'Uploading files',
              })}
            </Modal.Title>
          </Flex>
        </Modal.Header>

        <Modal.Body>
          <Flex direction="column" alignItems="stretch" gap={4}>
            <ProgressSection direction="column" alignItems="stretch" gap={2}>
              <Flex justifyContent="space-between">
                <Typography variant="pi" fontWeight="bold" textColor="neutral800">
                  {formatMessage({
                    id: getTrad('upload.progress.upload'),
                    defaultMessage: 'Upload',
                  })}
                </Typography>
                <Typography variant="pi" textColor="neutral600">
                  {progress}%
                </Typography>
              </Flex>
              <ProgressBar value={progress} />
            </ProgressSection>
          </Flex>
        </Modal.Body>

        <Modal.Footer>
          <Button onClick={onCancel} variant="tertiary">
            {formatMessage({
              id: 'app.components.Button.cancel',
              defaultMessage: 'Cancel upload',
            })}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};
