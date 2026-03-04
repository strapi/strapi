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
import { Folder as FolderIcon, More } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { AssetType } from '../../../enums';
import { prefixFileUrlWithBackendUrl } from '../../../utils/files';
import { getAssetIcon } from '../../../utils/getAssetIcon';
import { getTranslationKey } from '../../../utils/translations';
import { useFolderNavigation } from '../hooks/useFolderNavigation';

import type { File } from '../../../../../../shared/contracts/files';
import type { Folder } from '../../../../../../shared/contracts/folders';

/* -------------------------------------------------------------------------------------------------
 * AssetsGrid
 * -----------------------------------------------------------------------------------------------*/

const StyledCard = styled(Card)`
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.primary100};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: 2px;
  }
`;

/* -------------------------------------------------------------------------------------------------
 * FolderCard
 * -----------------------------------------------------------------------------------------------*/

const FoldersRow = styled(Box)`
  grid-column: 1 / -1;
`;

const StyledFolderCard = styled(Flex)`
  width: 100%;
  padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[3]}`}; // 8px 12px
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]}; // 8px
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.neutral0};
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.primary100};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: 2px;
  }
`;

const FolderIconContainer = styled(Flex)`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.neutral600};
`;

const FolderName = styled(Typography)`
  flex: 1;
  min-width: 0;
`;

interface FolderCardProps {
  folder: Folder;
}

const FolderCard = ({ folder }: FolderCardProps) => {
  const { formatMessage } = useIntl();
  const { navigateToFolder } = useFolderNavigation();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigateToFolder(folder);
    }
  };

  return (
    <StyledFolderCard
      onClick={() => navigateToFolder(folder)}
      onKeyDown={handleKeyDown}
      role="listitem"
      tabIndex={0}
    >
      <FolderIconContainer>
        <FolderIcon width={20} height={20} />
      </FolderIconContainer>
      <FolderName textColor="neutral800" ellipsis>
        {folder.name}
      </FolderName>
      <IconButton
        label={formatMessage({
          id: getTranslationKey('control-card.more-actions'),
          defaultMessage: 'More actions',
        })}
        variant="ghost"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <More />
      </IconButton>
    </StyledFolderCard>
  );
};

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
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
`;

const CardFooter = styled(Flex)`
  min-width: 0;
  width: 100%;
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
  onAssetItemClick: (assetId: number) => void;
}

const AssetCard = ({ asset, onAssetItemClick }: AssetCardProps) => {
  const { formatMessage } = useIntl();
  const TypeIcon = getAssetIcon(asset.mime, asset.ext);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onAssetItemClick(asset.id);
    }
  };

  return (
    <StyledCard
      tabIndex={0}
      role="listitem"
      onClick={() => onAssetItemClick(asset.id)}
      onKeyDown={handleKeyDown}
    >
      <StyledCardHeader>
        <AssetPreview asset={asset} />
      </StyledCardHeader>
      <CardBody>
        <CardFooter alignItems="center" gap={2}>
          <FileTypeIcon>
            <TypeIcon width={20} height={20} />
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
  folders?: Folder[];
  onAssetItemClick: (assetId: number) => void;
}

export const AssetsGrid = ({ assets, folders = [], onAssetItemClick }: AssetsGridProps) => {
  const { formatMessage } = useIntl();

  const totalItems = folders.length + assets.length;

  if (totalItems === 0) {
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
    <Grid.Root gap={4} role="list">
      {folders.length > 0 && (
        <FoldersRow>
          <Grid.Root gap={4}>
            {folders.map((folder) => (
              <Grid.Item col={3} m={4} s={6} xs={12} key={`folder-${folder.id}`}>
                <FolderCard folder={folder} />
              </Grid.Item>
            ))}
          </Grid.Root>
        </FoldersRow>
      )}
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
          <AssetCard asset={asset} onAssetItemClick={onAssetItemClick} />
        </Grid.Item>
      ))}
    </Grid.Root>
  );
};
