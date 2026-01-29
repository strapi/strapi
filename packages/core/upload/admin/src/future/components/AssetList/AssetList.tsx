import { Box, Flex, Loader, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { localStorageKeys, viewOptions } from '../../../constants';
import { usePersistentState } from '../../../hooks/usePersistentState';
import { getTrad } from '../../../utils';

import { AssetTable } from './AssetTable';

import type { File, Pagination } from '../../../../../shared/contracts/files';

interface AssetListProps {
  assets: File[];
  pagination?: Pagination;
  isLoading?: boolean;
  error?: unknown;
  sort?: string;
  onSortChange?: (sort: string) => void;
  onAssetClick?: (asset: File) => void;
}

export const AssetList = ({
  assets,
  isLoading = false,
  error,
  sort,
  onSortChange,
  onAssetClick,
}: AssetListProps) => {
  const { formatMessage } = useIntl();
  const [view] = usePersistentState(localStorageKeys.view, viewOptions.GRID);

  const isGridView = view === viewOptions.GRID;

  if (isLoading) {
    return (
      <Flex justifyContent="center" padding={8}>
        <Loader>{formatMessage({ id: 'app.loading', defaultMessage: 'Loading...' })}</Loader>
      </Flex>
    );
  }

  if (error) {
    return (
      <Box padding={8}>
        <Typography textColor="danger600">
          {formatMessage({
            id: getTrad('list.assets.error'),
            defaultMessage: 'An error occurred while fetching assets.',
          })}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {isGridView ? (
        <>{/* TODO grid view is not implemented yet */}</>
      ) : (
        <AssetTable
          assets={assets}
          sort={sort}
          onSortChange={onSortChange}
          onAssetClick={onAssetClick}
        />
      )}
    </Box>
  );
};
