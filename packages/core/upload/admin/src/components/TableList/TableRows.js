import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { getFileExtension } from '@strapi/helper-plugin';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { IconButton } from '@strapi/design-system/IconButton';
import { Tbody, Td, Tr } from '@strapi/design-system/Table';
import Pencil from '@strapi/icons/Pencil';

import { CellContent } from './CellContent';
import { AssetDefinition, FolderDefinition, tableHeaders as cells } from '../../constants';
import { getTrad } from '../../utils';

export const TableRows = ({ onEditAsset, onEditFolder, onSelectOne, rows, selected }) => {
  const { formatMessage } = useIntl();

  return (
    <Tbody>
      {rows.map((element) => {
        const { alternativeText, id, name, ext, url, mime, formats, type: elementType } = element;

        const isSelected = !!selected.find((currentRow) => currentRow.id === id);

        return (
          <Tr key={id}>
            <Td>
              <BaseCheckbox
                aria-label={formatMessage(
                  {
                    id: elementType === 'asset' ? 'list-assets-select' : 'list.folder.select',
                    defaultMessage:
                      elementType === 'asset' ? 'Select {name} asset' : 'Select {name} folder',
                  },
                  { name }
                )}
                onValueChange={() => onSelectOne({ ...element, elementType })}
                checked={isSelected}
              />
            </Td>
            {cells.map(({ name, type: cellType }) => {
              return (
                <Td key={name}>
                  <CellContent
                    alternativeText={alternativeText}
                    content={element[name]}
                    fileExtension={getFileExtension(ext)}
                    mime={mime}
                    cellType={cellType}
                    elementType={elementType}
                    thumbnailURL={formats?.thumbnail?.url}
                    url={url}
                  />
                </Td>
              );
            })}
            {((elementType === 'asset' && onEditAsset) ||
              (elementType === 'folder' && onEditFolder)) && (
              <Td>
                <IconButton
                  label={formatMessage({
                    id: getTrad('control-card.edit'),
                    defaultMessage: 'Edit',
                  })}
                  onClick={() =>
                    elementType === 'asset' ? onEditAsset(element) : onEditFolder(element)
                  }
                  noBorder
                >
                  <Pencil />
                </IconButton>
              </Td>
            )}
          </Tr>
        );
      })}
    </Tbody>
  );
};

TableRows.defaultProps = {
  onEditAsset: null,
  onEditFolder: null,
  rows: [],
  selected: [],
};

TableRows.propTypes = {
  rows: PropTypes.arrayOf(AssetDefinition, FolderDefinition),
  onEditAsset: PropTypes.func,
  onEditFolder: PropTypes.func,
  onSelectOne: PropTypes.func.isRequired,
  selected: PropTypes.arrayOf(AssetDefinition, FolderDefinition),
};
