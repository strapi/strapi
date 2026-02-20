import * as React from 'react';

import { Flex, IconButton, TextButton, Typography } from '@strapi/design-system';
import {
  ArrowsCounterClockwise,
  Check,
  CheckCircle,
  ChevronDown,
  Cross,
  CrossCircle,
  MinusCircle,
  Upload,
} from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled, keyframes } from 'styled-components';

import { abortUpload, useRetryCancelledFilesStreamMutation } from '../services/api';
import { useTypedDispatch, useTypedSelector } from '../store/hooks';
import { closeUploadProgress, toggleMinimize, cancelUpload } from '../store/uploadProgress';
import { getTranslationKey } from '../utils/translations';

import { Drawer } from './Drawer';

import type { FileProgress, FileProgressStatus } from '../store/uploadProgress';

/* -------------------------------------------------------------------------------------------------
 * DialogHeader
 * -----------------------------------------------------------------------------------------------*/

const HeaderStatusMessage = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  return (
    <Flex direction="column" alignItems="flex-start" paddingLeft={2}>
      <Drawer.Title>
        <Typography variant="omega">{title}</Typography>
      </Drawer.Title>
      <Drawer.Description>
        <Typography variant="pi" textColor="neutral600">
          {subtitle}
        </Typography>
      </Drawer.Description>
    </Flex>
  );
};

const HeaderStatusIcon = styled(Flex)`
  padding: ${({ theme }) => theme.spaces[3]};
  border-radius: ${({ theme }) => `${theme.borderRadius} 0 0 ${theme.borderRadius}`};

  > svg {
    height: 24px;
    width: 24px;
  }
`;

const HeaderStatusWrapper = styled(Drawer.Title)`
  display: flex;
  align-items: center;
`;

type HeaderStatusProps = {
  status: 'uploading' | 'success' | 'error' | 'canceled';
  progress?: number;
  totalFiles: number;
};

const HeaderStatus = ({ status, progress, totalFiles }: HeaderStatusProps) => {
  const { formatMessage } = useIntl();

  if (status === 'error') {
    return (
      <HeaderStatusWrapper>
        <HeaderStatusIcon background="danger200">
          <Cross fill="danger700" />
        </HeaderStatusIcon>
        <HeaderStatusMessage
          title={formatMessage({
            id: getTranslationKey('upload.progress.failed'),
            defaultMessage: 'Upload failed',
          })}
          subtitle={formatMessage({
            id: getTranslationKey('upload.progress.failed.subtitle'),
            defaultMessage: 'Please try to upload files again',
          })}
        />
      </HeaderStatusWrapper>
    );
  }

  if (status === 'success') {
    return (
      <HeaderStatusWrapper>
        <HeaderStatusIcon background="success200">
          <Check fill="success700" />
        </HeaderStatusIcon>
        <HeaderStatusMessage
          title={formatMessage({
            id: getTranslationKey('upload.progress.success'),
            defaultMessage: 'Upload successful!',
          })}
          subtitle={formatMessage(
            {
              id: getTranslationKey('upload.progress.success.subtitle'),
              defaultMessage: '{count} files uploaded successfully',
            },
            { count: totalFiles }
          )}
        />
      </HeaderStatusWrapper>
    );
  }

  if (status === 'canceled') {
    return (
      <HeaderStatusWrapper>
        <HeaderStatusIcon background="neutral200">
          <MinusCircle fill="neutral700" />
        </HeaderStatusIcon>
        <HeaderStatusMessage
          title={formatMessage({
            id: getTranslationKey('upload.progress.canceled'),
            defaultMessage: 'Upload canceled',
          })}
          subtitle={formatMessage({
            id: getTranslationKey('upload.progress.canceled.subtitle'),
            defaultMessage: 'Some files were not uploaded',
          })}
        />
      </HeaderStatusWrapper>
    );
  }

  if (status === 'uploading') {
    const progressPercentage = progress ? Math.round(progress) : 0;

    return (
      <HeaderStatusWrapper>
        <HeaderStatusIcon background="primary200">
          <Upload fill="primary700" />
        </HeaderStatusIcon>
        <HeaderStatusMessage
          title={formatMessage(
            {
              id: getTranslationKey('upload.progress.uploading.withCount'),
              defaultMessage: 'Uploading {total} items ({percentage}%)',
            },
            {
              total: totalFiles,
              percentage: progressPercentage,
            }
          )}
        />
      </HeaderStatusWrapper>
    );
  }

  return null;
};

const HeaderIconButton = styled(IconButton)`
  &:hover {
    background: transparent;
  }
`;

const ChevronWrapper = styled.span<{ $isMinimized: boolean }>`
  display: flex;
  transition: transform 0.5s ease-in-out;
  transform: ${({ $isMinimized }) => ($isMinimized ? 'rotate(180deg)' : 'rotate(0deg)')};
`;

const HEADER_COLOR_MAP = {
  uploading: { background: 'primary100' },
  canceled: { background: 'neutral100' },
  success: { background: 'success100' },
  error: { background: 'danger100' },
} as const;

const DialogHeader = ({ handleClose }: { handleClose: () => void }) => {
  const { formatMessage } = useIntl();

  const { isMinimized, progress, files, uploadId, totalFiles } = useTypedSelector(
    (state) => state.uploadProgress
  );
  const dispatch = useTypedDispatch();
  const [retryCancelledFiles] = useRetryCancelledFilesStreamMutation();

  const isComplete = progress === 100;
  const isAllUploaded = isComplete && files.every((f) => f.status !== 'uploading');
  const isAllErrored = isComplete && files.length > 0 && files.every((f) => f.status === 'error');
  const hasCancelledFiles = files.some((f) => f.status === 'cancelled');
  const isSuccess = isComplete && isAllUploaded && !isAllErrored && !hasCancelledFiles;
  const status = ((): HeaderStatusProps['status'] => {
    if (isAllErrored) return 'error';
    if (isSuccess) return 'success';
    if (hasCancelledFiles) return 'canceled';

    return 'uploading';
  })();

  const handleCancel = () => {
    abortUpload(uploadId);
    dispatch(cancelUpload());
  };

  const handleRetry = async () => {
    try {
      await retryCancelledFiles().unwrap();
    } catch {
      // Error is already dispatched to store from the API queryFn
    }
  };

  const handleToggleMinimize = () => {
    dispatch(toggleMinimize());
  };

  return (
    <Flex
      background={HEADER_COLOR_MAP[status].background}
      justifyContent="space-between"
      margin={1}
      hasRadius
    >
      <HeaderStatus status={status} progress={progress} totalFiles={totalFiles} />
      <Flex gap={1}>
        {!isAllUploaded && (
          <TextButton onClick={handleCancel} fontWeight="bold">
            {formatMessage({
              id: getTranslationKey('upload.progress.cancel'),
              defaultMessage: 'Cancel',
            })}
          </TextButton>
        )}
        {hasCancelledFiles && (
          <TextButton onClick={handleRetry} fontWeight="bold">
            {formatMessage({
              id: getTranslationKey('upload.progress.retry'),
              defaultMessage: 'Retry',
            })}
          </TextButton>
        )}
        <HeaderIconButton
          onClick={handleToggleMinimize}
          label={formatMessage({
            id: getTranslationKey(
              isMinimized ? 'upload.progress.maximize' : 'upload.progress.minimize'
            ),
            defaultMessage: isMinimized ? 'Maximize' : 'Minimize',
          })}
          variant="ghost"
        >
          <ChevronWrapper $isMinimized={isMinimized}>
            <ChevronDown />
          </ChevronWrapper>
        </HeaderIconButton>
        {isComplete && (
          <Drawer.CloseButton
            onClose={handleClose}
            label={formatMessage({
              id: getTranslationKey('upload.progress.close'),
              defaultMessage: 'Close',
            })}
          />
        )}
      </Flex>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * UploadProgressDialog
 * -----------------------------------------------------------------------------------------------*/

const indeterminate = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
`;

const IndeterminateBar = styled.div`
  width: 100%;
  height: ${({ theme }) => theme.spaces[1]};
  background-color: ${({ theme }) => theme.colors.neutral200};
  border-radius: 4px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 25%;
    background-color: ${({ theme }) => theme.colors.primary700};
    border-radius: 4px;
    animation: ${indeterminate} 1.5s ease-in-out infinite;
  }
`;

const FileRow = ({
  icon,
  fileName,
  children,
}: {
  icon: React.ReactNode;
  fileName: string;
  children: React.ReactNode;
}) => {
  return (
    <Flex direction="column" alignItems="stretch" justifyContent="center" gap={1} width="100%">
      <Flex gap={2}>
        {icon}
        <Typography variant="omega" fontWeight="semiBold" ellipsis>
          {fileName}
        </Typography>
      </Flex>
      {children}
    </Flex>
  );
};

const FileRowRenderer = ({ file }: { file: FileProgress }) => {
  const { formatMessage } = useIntl();
  const isError = file.status === 'error';
  const isCurrentFile = file.status === 'uploading';
  const isCompleted = file.status === 'complete';
  const isCancelled = file.status === 'cancelled';

  if (isCurrentFile) {
    return (
      <FileRow icon={<ArrowsCounterClockwise fill="secondary600" />} fileName={file.name}>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: getTranslationKey('upload.progress.file.uploading'),
            defaultMessage: 'Uploading...',
          })}
        </Typography>
        <IndeterminateBar />
      </FileRow>
    );
  }

  if (isError) {
    return (
      <FileRow icon={<CrossCircle fill="danger500" />} fileName={file.name}>
        <Typography variant="pi" textColor="neutral600">
          {file.error}
        </Typography>
      </FileRow>
    );
  }

  if (isCancelled) {
    return (
      <FileRow icon={<MinusCircle fill="neutral600" />} fileName={file.name}>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: getTranslationKey('upload.progress.file.canceled'),
            defaultMessage: 'Canceled',
          })}
        </Typography>
      </FileRow>
    );
  }

  if (isCompleted) {
    return (
      <FileRow icon={<CheckCircle fill="success500" />} fileName={file.name}>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: getTranslationKey('upload.progress.file.uploaded'),
            defaultMessage: 'Uploaded',
          })}
        </Typography>
      </FileRow>
    );
  }

  return null;
};

const CompletedFilesList = styled(Flex)`
  flex-direction: column;
  gap: ${({ theme }) => theme.spaces[2]};
  width: 100%;
`;

export const UploadProgressDialog = () => {
  const dispatch = useTypedDispatch();
  const { isVisible, isMinimized, files } = useTypedSelector((state) => state.uploadProgress);

  const currentFile = files.find((f) => f.status === 'uploading');
  const completedFiles = files
    .filter((f) => f.status === 'complete' || f.status === 'error' || f.status === 'cancelled')
    .sort((a, b) => {
      // Sort priority: error > cancelled > complete
      const priority: Record<FileProgressStatus, number> = {
        error: 0,
        cancelled: 1,
        complete: 2,
        uploading: 3,
        pending: 4,
      };
      return priority[a.status] - priority[b.status];
    });

  const handleClose = () => {
    dispatch(closeUploadProgress());
  };

  return (
    <Drawer.Root isVisible={isVisible} onClose={handleClose}>
      <Drawer.Body animationDirection="up" width="41.6rem" maxHeight="34.2rem">
        <DialogHeader handleClose={handleClose} />
        <Drawer.ScrollableContent isContentExpanded={!isMinimized}>
          <Flex
            direction="column"
            alignItems="stretch"
            gap={4}
            paddingTop={4}
            paddingBottom={4}
            paddingLeft={4}
            paddingRight={4}
          >
            {currentFile && <FileRowRenderer file={currentFile} />}

            {completedFiles.length > 0 && (
              <CompletedFilesList>
                {completedFiles.map((file) => (
                  <FileRowRenderer key={file.index} file={file} />
                ))}
              </CompletedFilesList>
            )}
          </Flex>
        </Drawer.ScrollableContent>
      </Drawer.Body>
    </Drawer.Root>
  );
};
