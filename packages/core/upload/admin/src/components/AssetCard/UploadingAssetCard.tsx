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

import { AssetType } from '../../constants';
import { useUpload } from '../../hooks/useUpload';
import { getTrad } from '../../utils';
import { UploadProgress } from '../UploadProgress/UploadProgress';

import type { RawFile, File } from '../../../../shared/contracts/files';

const UploadProgressWrapper = styled.div`
  height: 8.8rem;
  width: 100%;
`;

const Extension = styled.span`
  text-transform: uppercase;
`;

interface UploadingAssetCardProps {
  onCancel: (rawFile: RawFile) => void;
  onStatusChange: (status: string) => void;
  addUploadedFiles: (files: File[]) => void;
  folderId?: string | number | null;
  asset: Asset;
  id?: string;
  size?: 'S' | 'M';
}

interface Asset extends File {
  rawFile?: RawFile;
  type?: AssetType;
}

export const UploadingAssetCard = ({
  asset,
  onCancel,
  onStatusChange,
  addUploadedFiles,
  folderId = null,
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
      const files = await upload(asset, folderId ? Number(folderId) : null);

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
    onCancel(asset.rawFile!);
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={1}>
      <Card borderColor={error ? 'danger600' : 'neutral150'}>
        <CardHeader>
          <UploadProgressWrapper>
            <UploadProgress
              error={error || undefined}
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
            error?.message
              ? {
                  id: getTrad(`apiError.${error.message}`),
                  defaultMessage: error.message,
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
