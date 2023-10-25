import React from 'react';

import { BaseCheckbox, Flex, IconButton, Tbody, Td, Tr } from '@strapi/design-system';
import { onRowClick, stopPropagation } from '@strapi/helper-plugin';
import { Eye, Pencil } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { AssetDefinition, FolderDefinition, tableHeaders as cells } from '../../constants';
import { getTrad } from '../../utils';

import { CellContent } from './CellContent';

export const TableRows = ({
  onChangeFolder,
  onEditAsset,
  onEditFolder,
  onSelectOne,
  rows,
  selected,
}) => {
  const { formatMessage } = useIntl();

  const handleRowClickFn = (element, elementType, id, path) => {
    if (elementType === 'asset') {
      onEditAsset(element);
    } else {
      onChangeFolder(id, path);
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
            {...onRowClick({
              fn: () => handleRowClickFn(element, contentType, id, path),
            })}
          >
            <Td onClick={(e) => e.stopPropagation()}>
              <BaseCheckbox
                aria-label={formatMessage(
                  {
                    id: contentType === 'asset' ? 'list-assets-select' : 'list.folder.select',
                    defaultMessage:
                      contentType === 'asset' ? 'Select {name} asset' : 'Select {name} folder',
                  },
                  { name }
                )}
                disabled={!isSelectable}
                onValueChange={() => onSelectOne(element)}
                checked={isSelected}
              />
            </Td>
            {cells.map(({ name, type: cellType }) => {
              return (
                <Td key={name}>
                  <CellContent
                    content={element}
                    cellType={cellType}
                    contentType={contentType}
                    name={name}
                  />
                </Td>
              );
            })}

            <Td {...stopPropagation}>
              <Flex justifyContent="flex-end">
                {contentType === 'folder' && (
                  <IconButton
                    as={folderURL ? Link : undefined}
                    label={formatMessage({
                      id: getTrad('list.folders.link-label'),
                      defaultMessage: 'Access folder',
                    })}
                    to={folderURL}
                    onClick={() => !folderURL && onChangeFolder(id)}
                    noBorder
                  >
                    <Eye />
                  </IconButton>
                )}
                <IconButton
                  label={formatMessage({
                    id: getTrad('control-card.edit'),
                    defaultMessage: 'Edit',
                  })}
                  onClick={() =>
                    contentType === 'asset' ? onEditAsset(element) : onEditFolder(element)
                  }
                  noBorder
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

TableRows.defaultProps = {
  onChangeFolder: null,
  rows: [],
  selected: [],
};

TableRows.propTypes = {
  onChangeFolder: PropTypes.func,
  onEditAsset: PropTypes.func.isRequired,
  onEditFolder: PropTypes.func.isRequired,
  onSelectOne: PropTypes.func.isRequired,
  rows: PropTypes.arrayOf(AssetDefinition, FolderDefinition),
  selected: PropTypes.arrayOf(AssetDefinition, FolderDefinition),
};
