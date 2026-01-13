// TODO: find a better naming convention for the file that was an index file before
import * as React from 'react';

import { Page } from '@strapi/admin/strapi-admin';
import { Box, Flex, Typography } from '@strapi/design-system';
import { PlusCircle as PicturePlus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Route, Routes } from 'react-router-dom';
import { styled } from 'styled-components';

import { AssetSource } from '../../constants';
import { getTrad, rawFileToAsset } from '../../utils';
import { UploadProgressDialog } from '../components/UploadProgressDialog';
import { useUploadFilesMutation } from '../services/files';

const MediaBox = styled(Box)`
  border-style: dashed;
  transition: all 0.2s ease-in-out;
`;

const IconWrapper = styled.div`
  font-size: 6rem;

  svg path {
    fill: ${({ theme }) => theme.colors.primary600};
  }
`;

const OpaqueBox = styled(Box)`
  opacity: 0;
  cursor: pointer;
`;

const UnstableMediaLibrary = () => {
  const { formatMessage } = useIntl();
  const [uploadFiles, { isLoading, error: uploadError }] = useUploadFilesMutation();
  const [dragOver, setDragOver] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const uploadPromiseRef = React.useRef<ReturnType<typeof uploadFiles> | null>(null);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const assets = [];
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (file) {
        const asset = rawFileToAsset(file, AssetSource.Computer);
        assets.push(asset);
      }
    }

    if (assets.length === 0) return;

    setProgress(0);

    try {
      // Store the promise so we can abort it
      uploadPromiseRef.current = uploadFiles({
        assets,
        folderId: null,
        onProgress: setProgress,
      });

      await uploadPromiseRef.current.unwrap();

      setProgress(0);
      uploadPromiseRef.current = null;
    } catch (err) {
      uploadPromiseRef.current = null;
      // Error automatically available via `uploadError` from hook
      console.error('Upload failed:', err);
    }
  };

  const handleCancelUpload = () => {
    // Abort the ongoing upload
    if (uploadPromiseRef.current) {
      uploadPromiseRef.current.abort();
      uploadPromiseRef.current = null;
    }

    setProgress(0);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
    setDragOver(false);
  };

  const handleChange = () => {
    handleFiles(inputRef.current?.files || null);
  };

  return (
    <>
      <Box padding={8}>
        <MediaBox
          paddingTop={11}
          paddingBottom={11}
          hasRadius
          justifyContent="center"
          borderColor={dragOver ? 'primary500' : 'neutral300'}
          background={dragOver ? 'primary100' : 'neutral100'}
          position="relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <Flex justifyContent="center" direction="column" alignItems="center">
            <IconWrapper>
              <PicturePlus aria-hidden width="3.2rem" height="3.2rem" />
            </IconWrapper>

            <Box paddingTop={3} paddingBottom={5}>
              <Typography variant="delta" textColor="neutral600" tag="span">
                {formatMessage({
                  id: getTrad('input.label'),
                  defaultMessage: 'Drag & Drop here or',
                })}
              </Typography>
            </Box>

            {uploadError && (
              <Typography variant="omega" textColor="danger600">
                Upload failed:{' '}
                {uploadError && 'data' in uploadError
                  ? JSON.stringify((uploadError as unknown as { data: unknown }).data)
                  : 'Please try again'}
              </Typography>
            )}

            <OpaqueBox
              tag="input"
              position="absolute"
              left={0}
              right={0}
              bottom={0}
              top={0}
              width="100%"
              type="file"
              multiple
              name="files"
              aria-label={formatMessage({
                id: getTrad('input.label'),
                defaultMessage: 'Drag & Drop here or',
              })}
              tabIndex={-1}
              ref={inputRef}
              zIndex={1}
              onChange={handleChange}
            />
          </Flex>
        </MediaBox>
      </Box>

      <UploadProgressDialog open={isLoading} progress={progress} onCancel={handleCancelUpload} />
    </>
  );
};

export const UnstableMediaLibraryPage = () => {
  const { formatMessage } = useIntl();
  const title = formatMessage({ id: getTrad('plugin.name'), defaultMessage: 'Media Library' });

  return (
    <Page.Main>
      <Page.Title>{title}</Page.Title>

      <Routes>
        <Route index element={<UnstableMediaLibrary />} />
      </Routes>
    </Page.Main>
  );
};
