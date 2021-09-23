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
} from '@strapi/parts/Card';
import CloseAlertIcon from '@strapi/icons/CloseAlertIcon';
import { Text } from '@strapi/parts/Text';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { ProgressBar } from '@strapi/parts/ProgressBar';
import { useIntl } from 'react-intl';
import { getTrad } from '../../utils';
import { AssetType } from '../../constants';
import { useUpload } from '../../hooks/useUpload';

const Extension = styled.span`
  text-transform: uppercase;
`;

const BoxWrapper = styled(Row)`
  height: 88px;
  width: 100%;
  flex-direction: column;

  svg {
    path {
      fill: ${({ theme, error }) => (error ? theme.colors.danger600 : undefined)};
    }
  }
`;

const CancelButton = styled.button`
  border: none;
  background: none;
  display: flex;
  align-items: center;

  svg {
    path {
      fill: ${({ theme }) => theme.colors.neutral200};
    }

    height: 10px;
    width: 10px;
  }
`;

export const UploadingAssetCard = ({
  name,
  extension,
  assetType,
  file,
  onCancel,
  onStatusChange,
}) => {
  const { upload, cancel, error, progress, status } = useUpload();
  const { formatMessage } = useIntl();

  let badgeContent;

  if (assetType === AssetType.Image) {
    badgeContent = formatMessage({
      id: getTrad('settings.section.image.label'),
      defaultMessage: 'Image',
    });
  } else if (assetType === AssetType.Video) {
    badgeContent = formatMessage({
      id: getTrad('settings.section.video.label'),
      defaultMessage: 'Video',
    });
  } else {
    badgeContent = formatMessage({
      id: getTrad('settings.section.doc.label'),
      defaultMessage: 'Doc',
    });
  }

  useEffect(() => {
    upload(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onStatusChange(status);
  }, [status, onStatusChange]);

  const handleCancel = () => {
    cancel();
    onCancel(file);
  };

  return (
    <Stack size={1}>
      <Card borderColor={error ? 'danger600' : undefined}>
        <CardHeader>
          <BoxWrapper
            background={error ? 'danger100' : 'neutral700'}
            justifyContent="center"
            error={error}
            hasRadius
          >
            {error ? (
              <CloseAlertIcon aria-hidden />
            ) : (
              <>
                <Box paddingBottom={2}>
                  <ProgressBar value={progress} size="S">
                    {`${progress}/100%`}
                  </ProgressBar>
                </Box>

                <CancelButton type="button" onClick={handleCancel}>
                  <Text small as="span" textColor="neutral200">
                    {formatMessage({
                      id: 'app.components.Button.cancel',
                      defaultMessage: 'Cancel',
                    })}
                  </Text>
                  <Box as="span" paddingLeft={2} aria-hidden>
                    <CloseAlertIcon />
                  </Box>
                </CancelButton>
              </>
            )}
          </BoxWrapper>
        </CardHeader>
        <CardBody>
          <CardContent>
            <CardTitle as="h2">{name}</CardTitle>
            <CardSubtitle>
              <Extension>{extension}</Extension>
            </CardSubtitle>
          </CardContent>
          <CardBadge>{badgeContent}</CardBadge>
        </CardBody>
      </Card>
      {error ? (
        <Text small bold textColor="danger600">
          {error.message}
        </Text>
      ) : (
        undefined
      )}
    </Stack>
  );
};

UploadingAssetCard.propTypes = {
  assetType: PropTypes.oneOf(Object.values(AssetType)).isRequired,
  extension: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  file: PropTypes.instanceOf(File).isRequired,
  onCancel: PropTypes.func.isRequired,
  onStatusChange: PropTypes.func.isRequired,
};
