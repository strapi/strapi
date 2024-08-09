import { Checkbox, Flex, IconButton, Tbody, Td, Tr } from '@strapi/design-system';
import { Eye, Pencil } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

// TODO: replace with the import from the constants file when it will be migrated to TypeScript
import { tableHeaders as cells } from '../../newConstants';
// TODO: replace with the import from the constants index util file when it will be migrated to TypeScript
import { getTrad } from '../../utils/getTrad';
import type { Asset } from '../../../../shared/contracts/files';
import type { Folder } from '../../../../shared/contracts/folders';

import { CellContent } from './CellContent';
import type { Data } from '@strapi/types';

interface TableAsset extends Asset {
  folderURL?: string;
  path: string;
  type: string;
  isSelectable?: boolean;
  isLocal?: boolean;
}

interface TableFolder extends Folder {
  isSelectable?: boolean;
  folderURL?: string;
  type: string;
}

interface TableRowsProps {
  onChangeFolder?: (folderId: Data.ID, folderPath?: string) => void;
  onEditAsset: (element: TableAsset) => void;
  onEditFolder: (element: TableFolder) => void;
  onSelectOne: (element: TableAsset | TableFolder) => void;
  rows: TableAsset[] | TableFolder[];
  selected: TableAsset[] | TableFolder[];
}

export const TableRows = ({
  onChangeFolder,
  onEditAsset,
  onEditFolder,
  onSelectOne,
  rows = [],
  selected = [],
}: TableRowsProps) => {
  const { formatMessage } = useIntl();

  const handleRowClickFn = (element: Asset | Folder, elementType: string, id: Data.ID, path: string) => {
    if (elementType === 'asset') {
      onEditAsset(element as TableAsset);
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
          <Tr key={id} onClick={() => handleRowClickFn(element, contentType, id, path)}>
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
                    content={element as TableAsset}
                    cellType={cellType}
                    contentType={contentType}
                    name={name}
                  />
                </Td>
              );
            })}

            <Td onClick={(e) => e.stopPropagation()}>
              <Flex justifyContent="flex-end">
                {contentType === 'folder' && (
                  folderURL ? (
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
                      tag='button'
                      label={formatMessage({
                        id: getTrad('list.folders.link-label'),
                        defaultMessage: 'Access folder',
                      })}
                      onClick={() => onChangeFolder && onChangeFolder(id)}
                      variant="ghost"
                    >
                      <Eye />
                    </IconButton>
                  )
                )}
                <IconButton
                  label={formatMessage({
                    id: getTrad('control-card.edit'),
                    defaultMessage: 'Edit',
                  })}
                  onClick={() =>
                    contentType === 'asset' ? onEditAsset(element as TableAsset) : onEditFolder(element as TableFolder)
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
