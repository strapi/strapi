import { Checkbox, Flex, IconButton, Tbody, Td, Tr } from '@strapi/design-system';
import { Eye, Pencil } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { tableHeaders as cells } from '../../constants';
import { getTrad } from '../../utils';

import { CellContent } from './CellContent';

import type { File } from '../../../../shared/contracts/files';
import type { Folder } from '../../../../shared/contracts/folders';

interface FileRow extends File {
  folderURL?: string;
  isSelectable?: boolean;
  type?: string;
}

interface FolderRow extends Folder {
  folderURL?: string;
  isSelectable?: boolean;
  type?: string;
}

export interface TableRowsProps {
  onChangeFolder?: ((folderId: number, folderPath?: string) => void) | null;
  onEditAsset: (asset: FileRow) => void;
  onEditFolder: (folder: FolderRow) => void;
  onSelectOne: (element: FileRow | FolderRow) => void;
  rows: FileRow[] | FolderRow[];
  selected: FileRow[] | FolderRow[];
}

export const TableRows = ({
  onChangeFolder = null,
  onEditAsset,
  onEditFolder,
  onSelectOne,
  rows = [],
  selected = [],
}: TableRowsProps) => {
  const { formatMessage } = useIntl();

  const handleRowClickFn = (
    element: FileRow | FolderRow,
    id: number,
    path: FolderRow['path'],
    elementType?: string
  ) => {
    if (elementType === 'asset') {
      onEditAsset(element as FileRow);
    } else {
      if (onChangeFolder) {
        onChangeFolder(id, path);
      }
    }
  };

  return (
    <Tbody>
      {rows.map((element) => {
        const { path, id, isSelectable, name, folderURL, type: contentType } = element;

        const isSelected = !!selected.find(
          (currentRow) => currentRow.id === id && currentRow.type === contentType
        );

        return (
          <Tr
            key={id}
            onClick={() => handleRowClickFn(element, id, path || undefined, contentType)}
          >
            <Td onClick={(e) => e.stopPropagation()}>
              <Checkbox
                aria-label={formatMessage(
                  {
                    id: contentType === 'asset' ? 'list-assets-select' : 'list.folder.select',
                    defaultMessage:
                      contentType === 'asset' ? 'Select {name} asset' : 'Select {name} folder',
                  },
                  { name }
                )}
                disabled={!isSelectable}
                onCheckedChange={() => onSelectOne(element)}
                checked={isSelected}
              />
            </Td>
            {cells.map(({ name, type: cellType }) => {
              return (
                <Td key={name}>
                  <CellContent
                    content={element as FileRow}
                    cellType={cellType}
                    contentType={contentType}
                    name={name}
                  />
                </Td>
              );
            })}

            <Td onClick={(e) => e.stopPropagation()}>
              <Flex justifyContent="flex-end">
                {contentType === 'folder' &&
                  (folderURL ? (
                    <IconButton
                      tag={Link}
                      label={formatMessage({
                        id: getTrad('list.folders.link-label'),
                        defaultMessage: 'Access folder',
                      })}
                      to={folderURL}
                      variant="ghost"
                    >
                      <Eye />
                    </IconButton>
                  ) : (
                    <IconButton
                      tag="button"
                      label={formatMessage({
                        id: getTrad('list.folders.link-label'),
                        defaultMessage: 'Access folder',
                      })}
                      onClick={() => onChangeFolder && onChangeFolder(id)}
                      variant="ghost"
                    >
                      <Eye />
                    </IconButton>
                  ))}
                <IconButton
                  label={formatMessage({
                    id: getTrad('control-card.edit'),
                    defaultMessage: 'Edit',
                  })}
                  onClick={() =>
                    contentType === 'asset'
                      ? onEditAsset(element as FileRow)
                      : onEditFolder(element as FolderRow)
                  }
                  variant="ghost"
                >
                  <Pencil />
                </IconButton>
              </Flex>
            </Td>
          </Tr>
        );
      })}
    </Tbody>
  );
};
