// TODO: find a better naming convention for the file that was an index file before
import { Box, Grid, KeyboardNavigable, Typography } from '@strapi/design-system';

import { AssetCard } from '../AssetCard/AssetCard';

import { Draggable } from './Draggable';

import type { File } from '../../../../shared/contracts/files';
import type { AllowedTypes } from '../AssetCard/AssetCard';

export interface AssetGridListProps {
  allowedTypes?: AllowedTypes[];
  assets: File[];
  onEditAsset?: (asset: File) => void;
  onSelectAsset: (asset: File) => void;
  selectedAssets: File[];
  size?: 'S' | 'M';
  onReorderAsset?: (fromIndex: number, toIndex: number) => void;
  title?: string | null;
}

export const AssetGridList = ({
  allowedTypes = ['files', 'images', 'videos', 'audios'],
  assets,
  onEditAsset,
  onSelectAsset,
  selectedAssets,
  size = 'M',
  onReorderAsset,
  title = null,
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
