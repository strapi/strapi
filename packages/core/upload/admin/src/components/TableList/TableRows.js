import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useHistory, useLocation, Link } from 'react-router-dom';
import {
  getFileExtension,
  onRowClick,
  stopPropagation,
  useQueryParams,
} from '@strapi/helper-plugin';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { Flex } from '@strapi/design-system/Flex';
import { IconButton } from '@strapi/design-system/IconButton';
import { Tbody, Td, Tr } from '@strapi/design-system/Table';
import Pencil from '@strapi/icons/Pencil';
import Eye from '@strapi/icons/Eye';

import { CellContent } from './CellContent';
import { AssetDefinition, FolderDefinition, tableHeaders as cells } from '../../constants';
import { getFolderURL, getTrad } from '../../utils';

export const TableRows = ({
  canUpdate,
  onEditAsset,
  onEditFolder,
  onSelectOne,
  rows,
  selected,
}) => {
  const { formatMessage } = useIntl();
  const { pathname } = useLocation();
  const [{ query }] = useQueryParams();
  const { push } = useHistory();

  const handleRowClickFn = (element, elementType) => {
    if (elementType === 'asset') {
      onEditAsset(element);
    } else {
      push(getFolderURL(pathname, query, element));
    }
  };

  return (
    <Tbody>
      {rows.map((element) => {
        const { alternativeText, id, name, ext, url, mime, formats, type: elementType } = element;

        const isSelected = !!selected.find((currentRow) => currentRow.id === id);

        return (
          <Tr
            key={id}
            {...onRowClick({
              fn: () => handleRowClickFn(element, elementType),
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
                disabled={!canUpdate}
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
                    forwardedAs={Link}
                    label={formatMessage({
                      id: getTrad('list.folders.link-label'),
                      defaultMessage: 'Access folder',
                    })}
                    to={getFolderURL(pathname, query, element)}
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
  canUpdate: false,
  rows: [],
  selected: [],
};

TableRows.propTypes = {
  canUpdate: PropTypes.bool,
  rows: PropTypes.arrayOf(AssetDefinition, FolderDefinition),
  onEditAsset: PropTypes.func.isRequired,
  onEditFolder: PropTypes.func.isRequired,
  onSelectOne: PropTypes.func.isRequired,
  selected: PropTypes.arrayOf(AssetDefinition, FolderDefinition),
};
