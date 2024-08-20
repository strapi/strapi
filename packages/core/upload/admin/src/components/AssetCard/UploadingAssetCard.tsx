import * as React from 'react';

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
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

// TODO: replace tne import below with the one from the constants file when the file is migrated to ts
import { useUpload } from '../../hooks/useUpload';
import { AssetType } from '../../newConstants';
import { getTrad } from '../../utils';
import { UploadProgress } from '../UploadProgress/UploadProgress';
import type { Data } from '@strapi/types';
import type { Asset, AssetEnriched } from '../../../../shared/contracts/files';

const UploadProgressWrapper = styled.div`
  height: 8.8rem;
  width: 100%;
`;

const Extension = styled.span`
  text-transform: uppercase;
`;

interface UploadingAssetCardProps {
  addUploadedFiles?: (files: Asset[]) => void;
  asset: AssetEnriched;
  folderId: Data.ID | null;
  onCancel: (file: AssetEnriched['rawFile']) => void;
  onStatusChange: (status: string) => void;
  id?: string;
  size?: 'S' | 'M';
}

export const UploadingAssetCard = ({
  asset,
  onCancel,
  onStatusChange,
  addUploadedFiles,
  folderId,
}: UploadingAssetCardProps) => {
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

  React.useEffect(() => {
    const uploadFile = async () => {
      const files = await upload(asset, folderId);

      if (addUploadedFiles) {
        addUploadedFiles(files);
      }
    };

    uploadFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
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
            <UploadProgress
              error={error?.response?.data?.error || null}
              onCancel={handleCancel}
              progress={progress}
            />
          </UploadProgressWrapper>
        </CardHeader>
        <CardBody>
          <CardContent>
            <Box paddingTop={1}>
              <Typography tag="h2">
                <CardTitle tag="span">{asset.name}</CardTitle>
              </Typography>
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
