import { Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../../utils/utils';

import { BulkDeleteButton } from './BulkDeleteButton';
import { BulkMoveButton } from './BulkMoveButton';

import type { BulkDeleteButtonProps } from './BulkDeleteButton';
import type { BulkMoveButtonProps } from './BulkMoveButton';

export interface BulkActionsProps {
  selected: BulkDeleteButtonProps['selected'] | BulkMoveButtonProps['selected'];
  onSuccess: () => void;
  currentFolder?: BulkMoveButtonProps['currentFolder'];
}

export const BulkActions = ({ selected = [], onSuccess, currentFolder }: BulkActionsProps) => {
  const { formatMessage } = useIntl();
  const numberAssets = selected?.reduce(function (_this, val) {
    return val?.type === 'folder' && 'files' in val && val?.files && 'count' in val.files
      ? _this + val?.files?.count
      : _this + 1;
  }, 0);

  return (
    <Flex gap={2} paddingBottom={5}>
      <Typography variant="epsilon" textColor="neutral600">
        {formatMessage(
          {
            id: getTrad('list.assets.selected'),
            defaultMessage:
              '{numberFolders, plural, one {1 folder} other {# folders}} - {numberAssets, plural, one {1 asset} other {# assets}} selected',
          },
          {
            numberFolders: selected?.filter(({ type }) => type === 'folder').length,
            numberAssets,
          }
        )}
      </Typography>

      <BulkDeleteButton
        selected={selected as BulkDeleteButtonProps['selected']}
        onSuccess={onSuccess}
      />
      <BulkMoveButton
        currentFolder={currentFolder}
        selected={selected as BulkMoveButtonProps['selected']}
        onSuccess={onSuccess}
      />
    </Flex>
  );
};
