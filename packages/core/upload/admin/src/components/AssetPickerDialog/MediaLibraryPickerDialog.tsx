import { useIntl } from 'react-intl';

import { getTranslationKey } from '../../utils/translations';

import { AssetPickerDialog } from './AssetPickerDialog';

import type { File } from '../../../../shared/contracts/files';
import type { MediaAllowedTypes } from '../../utils/isAllowedAssetType';

/**
 * The `media-library` component contract, which the Wysiwyg and Blocks editors
 * render to insert images. Kept identical to the legacy `MediaLibraryDialog`.
 */
export interface MediaLibraryPickerDialogProps {
  allowedTypes?: MediaAllowedTypes;
  multiple?: boolean;
  initiallySelectedAssets?: File[];
  onClose: () => void;
  onSelectAssets: (selectedAssets: File[]) => void;
}

/**
 * The current asset picker behind the `media-library` component. The editors
 * insert assets rather than hold a value, and don't pass a field label, so the
 * title is generic.
 */
export const MediaLibraryPickerDialog = ({
  allowedTypes,
  multiple = true,
  initiallySelectedAssets,
  onClose,
  onSelectAssets,
}: MediaLibraryPickerDialogProps) => {
  const { formatMessage } = useIntl();

  return (
    <AssetPickerDialog
      open
      title={formatMessage({
        id: getTranslationKey('asset-picker.title.insert'),
        defaultMessage: 'Add assets',
      })}
      initialSelection={initiallySelectedAssets}
      multiple={multiple}
      allowedTypes={allowedTypes}
      onClose={onClose}
      onConfirm={onSelectAssets}
    />
  );
};
