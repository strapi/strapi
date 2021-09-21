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
import { ProgressBar } from '@strapi/parts/ProgressBar';
import { useIntl } from 'react-intl';
import { getTrad } from '../../utils';
import { AssetType } from '../../constants';
import { useUpload } from '../../hooks/useUpload';

const Extension = styled.span`
  text-transform: uppercase;
`;

const BoxWrapper = styled(Row)`
  // constant define in the DS, override for this specific case
  height: 88px;
  width: 100%;
  flex-direction: column;
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

export const UploadingAssetCard = ({ name, extension, assetType, file }) => {
  const { upload, cancel } = useUpload();
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
  }, [upload, file]);

  return (
    <Card>
      <CardHeader>
        <BoxWrapper background="neutral700" justifyContent="center">
          <Box paddingBottom={2}>
            <ProgressBar value={100} size="S">
              100/200 plugins loaded
            </ProgressBar>
          </Box>

          <CancelButton type="button" onClick={cancel}>
            <Text small as="span" textColor="neutral200">
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Text>
            <Box as="span" paddingLeft={2} aria-hidden>
              <CloseAlertIcon />
            </Box>
          </CancelButton>
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
  );
};

UploadingAssetCard.propTypes = {
  assetType: PropTypes.oneOf(Object.values(AssetType)).isRequired,
  extension: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  file: PropTypes.instanceOf(File).isRequired,
};
