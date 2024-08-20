import { Checkbox, Flex, IconButton, Tbody, Td, Tr } from '@strapi/design-system';
import { Eye, Pencil } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

// TODO: replace with the import from the constants file when it will be migrated to TypeScript
import { tableHeaders as cells } from '../../newConstants';
import { getTrad } from '../../utils';
import type { AssetEnriched, Asset } from '../../../../shared/contracts/files';
import type { Folder, FolderEnriched } from '../../../../shared/contracts/folders';

import { CellContent } from './CellContent';
import type { Data } from '@strapi/types';

interface TableRowsProps {
  onChangeFolder?: (folderId: Data.ID, folderPath?: string) => void;
  onEditAsset: (element: AssetEnriched) => void;
  onEditFolder: (element: FolderEnriched) => void;
  onSelectOne: (element: AssetEnriched | FolderEnriched) => void;
  rows: AssetEnriched[] | FolderEnriched[];
  selected: AssetEnriched[] | FolderEnriched[];
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

  const handleRowClickFn = (
    element: Asset | Folder,
    id: Data.ID,
    path?: string,
    elementType?: string
  ) => {
    if (elementType === 'asset') {
      onEditAsset(element as AssetEnriched);
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
          <Tr key={id} onClick={() => handleRowClickFn(element, id, path, contentType)}>
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
                    content={element as AssetEnriched}
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
                      ? onEditAsset(element as AssetEnriched)
                      : onEditFolder(element as FolderEnriched)
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
