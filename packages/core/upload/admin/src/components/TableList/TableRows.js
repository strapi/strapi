import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { getFileExtension } from '@strapi/helper-plugin';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { IconButton } from '@strapi/design-system/IconButton';
import { Tbody, Td, Tr } from '@strapi/design-system/Table';
import Pencil from '@strapi/icons/Pencil';

import { PreviewCell } from './PreviewCell';
import { TextCell } from './TextCell';
import { AssetDefinition, FolderDefinition } from '../../constants';
import { formatBytes, getTrad } from '../../utils';

export const TableRows = ({ onEditAsset, onEditFolder, onSelectOne, rows, selected }) => {
  const { formatDate, formatMessage } = useIntl();

  return (
    <Tbody>
      {rows.map((element) => {
        const {
          alternativeText,
          id,
          name,
          ext,
          size,
          createdAt,
          updatedAt,
          url,
          mime,
          formats,
          type,
        } = element;

        const isSelected = !!selected.find((currentRow) => currentRow.id === id);

        return (
          <Tr key={id}>
            <Td>
              <BaseCheckbox
                aria-label={formatMessage(
                  {
                    id: type === 'asset' ? 'list-assets-select' : 'list.folder.select',
                    defaultMessage:
                      type === 'asset' ? 'Select {name} asset' : 'Select {name} folder',
                  },
                  { name }
                )}
                onValueChange={() => onSelectOne({ ...element, type })}
                checked={isSelected}
              />
            </Td>
            <Td>
              <PreviewCell
                alternativeText={alternativeText}
                fileExtension={getFileExtension(ext)}
                mime={mime}
                type={type}
                thumbnailURL={formats?.thumbnail?.url}
                url={url}
              />
            </Td>
            <Td>
              <TextCell content={name} />
            </Td>
            <Td>
              <TextCell content={ext && getFileExtension(ext).toUpperCase()} />
            </Td>
            <Td>
              <TextCell content={size && formatBytes(size)} />
            </Td>
            <Td>
              <TextCell content={formatDate(new Date(createdAt))} />
            </Td>
            <Td>
              <TextCell content={formatDate(new Date(updatedAt))} />
            </Td>
            {((type === 'asset' && onEditAsset) || (type === 'folder' && onEditFolder)) && (
              <Td>
                <IconButton
                  label={formatMessage({
                    id: getTrad('control-card.edit'),
                    defaultMessage: 'Edit',
                  })}
                  onClick={() => (type === 'asset' ? onEditAsset(element) : onEditFolder(element))}
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
