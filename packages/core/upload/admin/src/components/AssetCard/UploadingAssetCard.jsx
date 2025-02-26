import React, { useEffect } from 'react';

import {
  Box,
  Card,
  CardBadge,
  CardBody,
  CardContent,
  CardHeader,
  CardSubtitle,
  CardTitle,
  Flex,
  Typography,
} from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { AssetType } from '../../constants';
import { useUpload } from '../../hooks/useUpload';
import { getTrad } from '../../utils';
import { UploadProgress } from '../UploadProgress';

const UploadProgressWrapper = styled.div`
  height: ${88 / 16}rem;
  width: 100%;
`;

const Extension = styled.span`
  text-transform: uppercase;
`;

export const UploadingAssetCard = ({
  asset,
  onCancel,
  onStatusChange,
  addUploadedFiles,
  folderId,
  performUpload,
  setCurrentAssetIndexUploading,
}) => {
  const { upload, cancel, error, progress, status } = useUpload();
  const { formatMessage } = useIntl();

  let badgeContent = formatMessage({
    id: getTrad('settings.section.doc.label'),
    defaultMessage: 'Doc',
  });

  if (asset.type === AssetType.Image) {
    badgeContent = formatMessage({
      id: getTrad('settings.section.image.label'),
      defaultMessage: 'Image',
    });
  } else if (asset.type === AssetType.Video) {
    badgeContent = formatMessage({
      id: getTrad('settings.section.video.label'),
      defaultMessage: 'Video',
    });
  } else if (asset.type === AssetType.Audio) {
    badgeContent = formatMessage({
      id: getTrad('settings.section.audio.label'),
      defaultMessage: 'Audio',
    });
  }

  useEffect(() => {
    const uploadFile = async () => {
      const files = await upload(asset, folderId);

      if (addUploadedFiles) {
        addUploadedFiles(files);
      }
    };

    if (!performUpload) return;

    uploadFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performUpload]);

  useEffect(() => {
    if (error) {
      setCurrentAssetIndexUploading((i) => i + 1);
    }
  }, [error]);

  useEffect(() => {
    onStatusChange(status);
  }, [status, onStatusChange]);

  const handleCancel = () => {
    cancel();
    onCancel(asset.rawFile);
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={1}>
      <Card borderColor={error ? 'danger600' : 'neutral150'}>
        <CardHeader>
          <UploadProgressWrapper>
            <UploadProgress error={error} onCancel={handleCancel} progress={progress} />
          </UploadProgressWrapper>
        </CardHeader>
        <CardBody>
          <CardContent>
            <Box paddingTop={1}>
              <CardTitle as="h2">{asset.name}</CardTitle>
            </Box>
            <CardSubtitle>
              <Extension>{asset.ext}</Extension>
            </CardSubtitle>
          </CardContent>
          <Flex paddingTop={1} grow={1}>
            <CardBadge>{badgeContent}</CardBadge>
          </Flex>
        </CardBody>
      </Card>
      {error ? (
        <Typography variant="pi" fontWeight="bold" textColor="danger600">
          {formatMessage(
            error?.response?.data?.error?.message
              ? {
                  id: getTrad(`apiError.${error.response.data.error.message}`),
                  defaultMessage: error.response.data.error.message,
                  /* See issue: https://github.com/strapi/strapi/issues/13867
             A proxy might return an error, before the request reaches Strapi
             and therefore we need to handle errors gracefully.
          */
                }
              : {
                  id: getTrad('upload.generic-error'),
                  defaultMessage: 'An error occured while uploading the file.',
                }
          )}
        </Typography>
      ) : undefined}
    </Flex>
  );
};

UploadingAssetCard.defaultProps = {
  addUploadedFiles: undefined,
  folderId: null,
};

UploadingAssetCard.propTypes = {
  addUploadedFiles: PropTypes.func,
  asset: PropTypes.shape({
    name: PropTypes.string,
    ext: PropTypes.string,
    rawFile: PropTypes.instanceOf(File),
    type: PropTypes.oneOf(Object.values(AssetType)),
  }).isRequired,
  folderId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onCancel: PropTypes.func.isRequired,
  onStatusChange: PropTypes.func.isRequired,
};
