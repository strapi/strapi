// TODO: find a better naming convention for the file that was an index file before
import { Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils';
import { AssetGridList } from '../../AssetGridList/AssetGridList';

import type { File } from '../../../../../shared/contracts/files';

interface SelectedStepProps {
  onSelectAsset: (asset: File) => void;
  selectedAssets: File[];
  onReorderAsset?: (fromIndex: number, toIndex: number) => void;
}

export const SelectedStep = ({
  selectedAssets,
  onSelectAsset,
  onReorderAsset,
}: SelectedStepProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Flex gap={0} direction="column" alignItems="start">
        <Typography variant="pi" fontWeight="bold" textColor="neutral800">
          {formatMessage(
            {
              id: getTrad('list.assets.to-upload'),
              defaultMessage:
                '{number, plural, =0 {No asset} one {1 asset} other {# assets}} ready to upload',
            },
            { number: selectedAssets.length }
          )}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: getTrad('modal.upload-list.sub-header-subtitle'),
            defaultMessage: 'Manage the assets before adding them to the Media Library',
          })}
        </Typography>
      </Flex>

      <AssetGridList
        size="S"
        assets={selectedAssets}
        onSelectAsset={onSelectAsset}
        selectedAssets={selectedAssets}
        onReorderAsset={onReorderAsset}
      />
    </Flex>
  );
};
