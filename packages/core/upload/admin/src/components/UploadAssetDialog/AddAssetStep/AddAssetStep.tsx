import { Box, Divider, Modal, Tabs } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils/getTrad';

import { FromComputerForm } from './FromComputerForm';
import { FromUrlForm } from './FromUrlForm';

// TODO: replace it with the import from the costants file when it will be migrated to typescript
import { AssetSource } from '../../../newConstants';
import type { Asset, RawFile } from '../../../../../shared/contracts/files';

export type UploadAsset = Pick<Asset, 'name' | 'url' | 'ext' | 'mime'> & {
  rawFile: RawFile;
  type?: string;
  isLocal?: boolean;
  source: AssetSource;
} & Partial<Pick<Asset, 'size' | 'createdAt'>>;

interface AddAssetStepProps {
  onClose: () => void;
  onAddAsset: (assets: UploadAsset[]) => void;
  trackedLocation?: string;
}

export const AddAssetStep = ({ onClose, onAddAsset, trackedLocation }: AddAssetStepProps) => {
  const { formatMessage } = useIntl();

  return (
    <>
      <Modal.Header>
        <Modal.Title>
          {formatMessage({
            id: getTrad('header.actions.add-assets'),
            defaultMessage: 'Add new assets',
          })}
        </Modal.Title>
      </Modal.Header>
      <Tabs.Root variant="simple" defaultValue="computer">
        <Box paddingLeft={8} paddingRight={8} paddingTop={6}>
          <Tabs.List
            aria-label={formatMessage({
              id: getTrad('tabs.title'),
              defaultMessage: 'How do you want to upload your assets?',
            })}
          >
            <Tabs.Trigger value="computer">
              {formatMessage({
                id: getTrad('modal.nav.computer'),
                defaultMessage: 'From computer',
              })}
            </Tabs.Trigger>
            <Tabs.Trigger value="url">
              {formatMessage({
                id: getTrad('modal.nav.url'),
                defaultMessage: 'From URL',
              })}
            </Tabs.Trigger>
          </Tabs.List>

          <Divider />
        </Box>
        <Tabs.Content value="computer">
          <FromComputerForm
            onClose={onClose}
            onAddAssets={onAddAsset}
            trackedLocation={trackedLocation}
          />
        </Tabs.Content>
        <Tabs.Content value="url">
          <FromUrlForm
            onClose={onClose}
            onAddAsset={onAddAsset}
            trackedLocation={trackedLocation}
          />
        </Tabs.Content>
      </Tabs.Root>
    </>
  );
};
