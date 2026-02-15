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
import { More } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { AssetType } from '../../../enums';
import { prefixFileUrlWithBackendUrl } from '../../../utils/files';
import { getAssetIcon } from '../../../utils/getAssetIcon';
import { getTranslationKey } from '../../../utils/translations';

import type { File } from '../../../../../../shared/contracts/files';

/* -------------------------------------------------------------------------------------------------
 * AssetsGrid
 * -----------------------------------------------------------------------------------------------*/

const StyledCard = styled(Card)`
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: 8px;
  overflow: hidden;
`;

/* -------------------------------------------------------------------------------------------------
 * AssetPreview
 * -----------------------------------------------------------------------------------------------*/

const PreviewContainer = styled(Box)`
  position: relative;
  width: 100%;
  padding-bottom: 62.5%;
  height: 0;
  overflow: hidden;
  background: repeating-conic-gradient(
      ${({ theme }) => theme.colors.neutral100} 0% 25%,
      transparent 0% 50%
    )
    50% / 20px 20px;
`;

const StyledImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const IconPreview = styled(Flex)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  color: ${({ theme }) => theme.colors.neutral500};
  background: ${({ theme }) => theme.colors.neutral100};
`;

interface AssetPreviewProps {
  asset: File;
}

const AssetPreview = ({ asset }: AssetPreviewProps) => {
  const { alternativeText, ext, formats, mime, url } = asset;

  if (mime?.includes(AssetType.Image)) {
    const mediaURL =
      prefixFileUrlWithBackendUrl(formats?.thumbnail?.url) ?? prefixFileUrlWithBackendUrl(url);

    if (mediaURL) {
      return (
        <PreviewContainer>
          <StyledImage src={mediaURL} alt={alternativeText || ''} />
        </PreviewContainer>
      );
    }
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

/* -------------------------------------------------------------------------------------------------
 * AssetCard
 * -----------------------------------------------------------------------------------------------*/

const StyledCardHeader = styled(CardHeader)`
  border-bottom: none;
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

const AssetCard = ({ asset }: AssetCardProps) => {
  const { formatMessage } = useIntl();
  const TypeIcon = getAssetIcon(asset.mime, asset.ext);

  return (
    <StyledCard>
      <StyledCardHeader>
        <AssetPreview asset={asset} />
      </StyledCardHeader>
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

/* -------------------------------------------------------------------------------------------------
 * AssetsGrid
 * -----------------------------------------------------------------------------------------------*/

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
