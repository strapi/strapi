import { Box, Grid, KeyboardNavigable, Typography } from '@strapi/design-system';

import { AssetCard } from '../AssetCard/AssetCard';

import { Draggable } from './Draggable';
import type { Asset } from '../../../../shared/contracts/files';

interface RawFile extends Blob {
  size: number;
  lastModified: number;
  name: string;
  type: string;
}
interface AssetProps extends Asset {
  type?: string;
  isSelectable?: boolean;
  isLocal?: boolean;
  allowedTypes?: string[];
  rawFile: RawFile;
}

interface AssetGridListProps {
  allowedTypes?: string[];
  assets: AssetProps[];
  onEditAsset?: (asset: AssetProps) => void;
  onSelectAsset: (asset: AssetProps) => void;
  selectedAssets: AssetProps[];
  onReorderAsset?: (hoverIndex: number, destIndex: number) => void;
  size?: 'S' | 'M';
  title?: string;
}

export const AssetGridList = ({
  assets,
  onEditAsset,
  onSelectAsset,
  selectedAssets,
  onReorderAsset,
  title,
  size = 'M',
  allowedTypes = ['images', 'files', 'videos', 'audios'],
}: AssetGridListProps) => {
  return (
    <KeyboardNavigable tagName="article">
      {title && (
        <Box paddingTop={2} paddingBottom={2}>
          <Typography tag="h2" variant="delta" fontWeight="semiBold">
            {title}
          </Typography>
        </Box>
      )}

      <Grid.Root gap={4}>
        {assets.map((asset, index) => {
          const isSelected = !!selectedAssets.find((currentAsset) => currentAsset.id === asset.id);

          if (onReorderAsset) {
            return (
              <Grid.Item key={asset.id} col={3} height="100%">
                <Draggable index={index} moveItem={onReorderAsset} id={asset.id}>
                  <AssetCard
                    allowedTypes={allowedTypes}
                    asset={asset}
                    isSelected={isSelected}
                    onEdit={onEditAsset ? () => onEditAsset(asset) : undefined}
                    onSelect={() => onSelectAsset(asset)}
                    size={size}
                  />
                </Draggable>
              </Grid.Item>
            );
          }

          return (
            <Grid.Item col={3} key={asset.id} height="100%" direction="column" alignItems="stretch">
              <AssetCard
                key={asset.id}
                allowedTypes={allowedTypes}
                asset={asset}
                isSelected={isSelected}
                onEdit={onEditAsset ? () => onEditAsset(asset) : undefined}
                onSelect={() => onSelectAsset(asset)}
                size={size}
              />
            </Grid.Item>
          );
        })}
      </Grid.Root>
    </KeyboardNavigable>
  );
};
