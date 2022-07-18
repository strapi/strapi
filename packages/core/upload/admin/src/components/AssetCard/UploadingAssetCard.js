import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import {
  Card,
  CardBody,
  CardContent,
  CardHeader,
  CardTitle,
  CardSubtitle,
  CardBadge,
} from '@strapi/design-system/Card';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import { Box } from '@strapi/design-system/Box';
import { useIntl } from 'react-intl';
import { getTrad } from '../../utils';
import { AssetType } from '../../constants';
import { useUpload } from '../../hooks/useUpload';
import { UploadProgress } from '../UploadProgress';

const UploadProgressWrapper = styled.div`
  height: ${88 / 16}rem;
  width: 100%;
`;

const Extension = styled.span`
  text-transform: uppercase;
`;

export const UploadingAssetCard = ({ asset, onCancel, onStatusChange, addUploadedFiles }) => {
  const { upload, cancel, error, progress, status } = useUpload(asset);
  const { formatMessage } = useIntl();

  let badgeContent;

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
  } else {
    badgeContent = formatMessage({
      id: getTrad('settings.section.doc.label'),
      defaultMessage: 'Doc',
    });
  }

  useEffect(() => {
    const uploadFile = async () => {
      const files = await upload(asset);

      if (addUploadedFiles) {
        addUploadedFiles(files);
      }
    };

    uploadFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onStatusChange(status);
  }, [status, onStatusChange]);

  const handleCancel = () => {
    cancel();
    onCancel(asset.rawFile);
  };

  return (
    <Stack spacing={1}>
      <Card borderColor={error ? 'danger600' : undefined}>
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
          <CardBadge>{badgeContent}</CardBadge>
        </CardBody>
      </Card>
      {error ? (
        <Typography variant="pi" fontWeight="bold" textColor="danger600">
          {formatMessage({
            id: getTrad(`apiError.${error.response.data.error.message}`),
            defaultMessage: error.response.data.error.message,
          })}
        </Typography>
      ) : (
        undefined
      )}
    </Stack>
  );
};

UploadingAssetCard.defaultProps = {
  addUploadedFiles: undefined,
};

UploadingAssetCard.propTypes = {
  addUploadedFiles: PropTypes.func,
  asset: PropTypes.shape({
    name: PropTypes.string,
    ext: PropTypes.string,
    rawFile: PropTypes.instanceOf(File),
    type: PropTypes.oneOf(Object.values(AssetType)),
  }).isRequired,
  onCancel: PropTypes.func.isRequired,
  onStatusChange: PropTypes.func.isRequired,
};
