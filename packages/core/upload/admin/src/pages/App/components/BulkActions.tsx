import { Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils';

import { BulkDeleteButton } from './BulkDeleteButton';
import { BulkMoveButton } from './BulkMoveButton';

import type { File } from '../../../../../shared/contracts/files';
import type {
  FolderDefinition,
  Folder as FolderInitial,
} from '../../../../../shared/contracts/folders';
interface FolderWithType extends FolderInitial {
  type: string;
}

export interface FileWithType extends File {
  type: string;
}

interface BulkActionsProps {
  selected: Array<FileWithType | FolderDefinition> | Array<FolderWithType | FileWithType>;
  onSuccess: () => void;
  currentFolder?: FolderWithType;
}

export const BulkActions = ({ selected = [], onSuccess, currentFolder }: BulkActionsProps) => {
  const { formatMessage } = useIntl();

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
            numberFolders: selected.filter(({ type }) => type === 'folder').length,
            numberAssets: selected.filter(({ type }) => type === 'asset').length,
          }
        )}
      </Typography>

      <BulkDeleteButton
        selected={selected as Array<FileWithType | FolderDefinition>}
        onSuccess={onSuccess}
      />
      <BulkMoveButton
        currentFolder={currentFolder}
        selected={selected as Array<FolderWithType | FileWithType>}
        onSuccess={onSuccess}
      />
    </Flex>
  );
};
