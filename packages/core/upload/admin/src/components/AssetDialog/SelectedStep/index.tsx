import { Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils/getTrad';
import { AssetGridList } from '../../AssetGridList/AssetGridList';
import type { Asset } from '../../../../../shared/contracts/files';
import type { RawFile } from '../../../types';

interface AssetProps extends Asset {
  type?: string;
  isSelectable?: boolean;
  isLocal?: boolean;
  allowedTypes?: string[];
  rawFile: RawFile;
}

interface SelectedStepProps {
  onSelectAsset: (asset: AssetProps) => void;
  selectedAssets: AssetProps[];
  onReorderAsset?: (hoverIndex: number, destIndex: number) => void;
}

export const SelectedStep = ({
  selectedAssets,
  onSelectAsset,
  onReorderAsset,
}: SelectedStepProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Flex gap={0}>
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
