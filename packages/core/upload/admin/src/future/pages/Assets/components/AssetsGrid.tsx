import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Grid,
  IconButton,
  Typography,
} from '@strapi/design-system';
import { Monitor, More, VolumeUp } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { AssetType } from '../../../enums';
import { prefixFileUrlWithBackendUrl } from '../../../utils/files';
import { getAssetIcon } from '../../../utils/getAssetIcon';
import { getTranslationKey } from '../../../utils/translations';

import type { File } from '../../../../../../shared/contracts/files';

const PREVIEW_HEIGHT = 208;

const StyledCard = styled(Card)`
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: 8px;
  overflow: hidden;
`;

const PreviewContainer = styled(Flex)`
  height: ${PREVIEW_HEIGHT}px;
  background: ${({ theme }) => theme.colors.neutral100};
`;

const StyledImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const IconPreview = styled(Flex)`
  width: 100%;
  height: 100%;
  color: ${({ theme }) => theme.colors.neutral500};
`;

const CardFooter = styled(Flex)`
  min-width: 0;
`;

const FileTypeIcon = styled(Flex)`
  color: ${({ theme }) => theme.colors.neutral600};
  flex-shrink: 0;
`;

const FileName = styled(Typography)`
  flex: 1;
  min-width: 0;
`;

interface AssetCardProps {
  asset: File;
}

interface AssetPreviewProps {
  asset: File;
}

const AssetPreview = ({ asset }: AssetPreviewProps) => {
  const { alternativeText, ext, formats, mime, url } = asset;

  if (mime?.includes(AssetType.Image)) {
    const mediaURL =
      prefixFileUrlWithBackendUrl(formats?.thumbnail?.url) ?? prefixFileUrlWithBackendUrl(url);

    return (
      <PreviewContainer>
        <StyledImage src={mediaURL ?? undefined} alt={alternativeText || ''} />
      </PreviewContainer>
    );
  }

  if (mime?.includes(AssetType.Video) || mime?.includes(AssetType.Audio)) {
    const Icon = mime?.includes(AssetType.Video) ? Monitor : VolumeUp;
    return (
      <PreviewContainer>
        <IconPreview justifyContent="center" alignItems="center">
          <Icon width={48} height={48} />
        </IconPreview>
      </PreviewContainer>
    );
  }

  const DocIcon = getAssetIcon(mime, ext);

  return (
    <PreviewContainer>
      <IconPreview justifyContent="center" alignItems="center">
        <DocIcon width={48} height={48} />
      </IconPreview>
    </PreviewContainer>
  );
};

const AssetCard = ({ asset }: AssetCardProps) => {
  const { formatMessage } = useIntl();
  const TypeIcon = getAssetIcon(asset.mime, asset.ext);

  return (
    <StyledCard>
      <CardHeader>
        <AssetPreview asset={asset} />
      </CardHeader>
      <CardBody>
        <CardFooter alignItems="center" gap={2} paddingTop={2}>
          <FileTypeIcon>
            <TypeIcon width={16} height={16} />
          </FileTypeIcon>
          <FileName textColor="primary800" ellipsis>
            {asset.name}
          </FileName>
          <IconButton
            label={formatMessage({
              id: getTranslationKey('control-card.more-actions'),
              defaultMessage: 'More actions',
            })}
            variant="ghost"
          >
            <More />
          </IconButton>
        </CardFooter>
      </CardBody>
    </StyledCard>
  );
};

interface AssetsGridProps {
  assets: File[];
}

export const AssetsGrid = ({ assets }: AssetsGridProps) => {
  const { formatMessage } = useIntl();

  if (assets.length === 0) {
    return (
      <Box padding={8}>
        <Typography textColor="neutral600">
          {formatMessage({
            id: 'app.components.EmptyStateLayout.content-document',
            defaultMessage: 'No content found',
          })}
        </Typography>
      </Box>
    );
  }

  return (
    <Grid.Root gap={4}>
      {assets.map((asset) => (
        <Grid.Item
          col={3}
          m={4}
          s={6}
          xs={12}
          key={asset.id}
          direction="column"
          alignItems="stretch"
        >
          <AssetCard asset={asset} />
        </Grid.Item>
      ))}
    </Grid.Root>
  );
};
