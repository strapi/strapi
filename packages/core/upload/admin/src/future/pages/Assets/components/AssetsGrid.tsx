import { Box, Grid, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { AssetCard } from './AssetCard';

import type { File } from '../../../../../../shared/contracts/files';

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
