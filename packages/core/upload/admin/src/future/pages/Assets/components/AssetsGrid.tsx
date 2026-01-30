import { Box, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import type { File } from '../../../../../../shared/contracts/files';

interface AssetsGridProps {
  assets: File[];
  onAssetClick?: (asset: File) => void;
}

export const AssetsGrid = ({ assets: _assets, onAssetClick: _onAssetClick }: AssetsGridProps) => {
  const { formatMessage } = useIntl();

  // TODO: Implement grid view
  return (
    <Box padding={4}>
      <Typography textColor="neutral600">
        {formatMessage({
          id: 'app.components.NotImplemented',
          defaultMessage: 'Grid view...',
        })}
      </Typography>
    </Box>
  );
};
