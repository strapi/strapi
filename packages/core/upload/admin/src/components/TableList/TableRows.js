import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { getFileExtension, onRowClick, stopPropagation } from '@strapi/helper-plugin';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { Flex } from '@strapi/design-system/Flex';
import { IconButton } from '@strapi/design-system/IconButton';
import { Tbody, Td, Tr } from '@strapi/design-system/Table';
import Pencil from '@strapi/icons/Pencil';
import Eye from '@strapi/icons/Eye';

import { CellContent } from './CellContent';
import { isSelectable } from './utils/isSelectable';
import { AssetDefinition, FolderDefinition, tableHeaders as cells } from '../../constants';
import { getTrad, toSingularTypes } from '../../utils';

export const TableRows = ({
  allowedTypes,
  canUpdate,
  isFolderSelectionAllowed,
  onChangeFolder,
  onEditAsset,
  onEditFolder,
  onSelectOne,
  rows,
  selected,
}) => {
  const { formatMessage } = useIntl();

  const handleRowClickFn = (element, elementType, id) => {
    if (elementType === 'asset') {
      onEditAsset(element);
    } else {
      onChangeFolder(id);
    }
  };

  const singularTypes = toSingularTypes(allowedTypes);

  return (
    <Tbody>
      {rows.map((element) => {
        const {
          alternativeText,
          id,
          name,
          ext,
          url,
          mime = '',
          folderURL,
          formats,
          type: elementType,
        } = element;

        const fileType = mime.split('/')[0];
        const canBeSelected =
          isSelectable(singularTypes, elementType, fileType, isFolderSelectionAllowed) && canUpdate;

        const isSelected = !!selected.find((currentRow) => currentRow.id === id);

        return (
          <Tr
            key={id}
            {...onRowClick({
              fn: () => handleRowClickFn(element, elementType, id),
            })}
          >
            <Td {...stopPropagation}>
              <BaseCheckbox
                aria-label={formatMessage(
                  {
                    id: elementType === 'asset' ? 'list-assets-select' : 'list.folder.select',
                    defaultMessage:
                      elementType === 'asset' ? 'Select {name} asset' : 'Select {name} folder',
                  },
                  { name }
                )}
                disabled={!canBeSelected}
                onValueChange={() => onSelectOne(element)}
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

            <Td {...stopPropagation}>
              <Flex justifyContent="flex-end">
                {elementType === 'folder' && (
                  <IconButton
                    forwardedAs={folderURL ? Link : undefined}
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
                    elementType === 'asset' ? onEditAsset(element) : onEditFolder(element)
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
  allowedTypes: ['images', 'files', 'videos', 'audios'],
  canUpdate: true,
  onChangeFolder: null,
  isFolderSelectionAllowed: true,
  rows: [],
  selected: [],
};

TableRows.propTypes = {
  allowedTypes: PropTypes.arrayOf(PropTypes.string),
  canUpdate: PropTypes.bool,
  isFolderSelectionAllowed: PropTypes.bool,
  rows: PropTypes.arrayOf(AssetDefinition, FolderDefinition),
  onChangeFolder: PropTypes.func,
  onEditAsset: PropTypes.func.isRequired,
  onEditFolder: PropTypes.func.isRequired,
  onSelectOne: PropTypes.func.isRequired,
  selected: PropTypes.arrayOf(AssetDefinition, FolderDefinition),
};
