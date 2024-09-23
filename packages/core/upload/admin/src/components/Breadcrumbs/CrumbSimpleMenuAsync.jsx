import React, { useState } from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { Loader } from '@strapi/design-system';
import { CrumbSimpleMenu, MenuItem } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { NavLink, useLocation } from 'react-router-dom';

import { useFolderStructure } from '../../hooks/useFolderStructure';
import { getFolderParents, getFolderURL, getTrad } from '../../utils';

export const CrumbSimpleMenuAsync = ({ parentsToOmit, currentFolderId, onChangeFolder }) => {
  const [shouldFetch, setShouldFetch] = useState(false);
  const { data, isLoading } = useFolderStructure({ enabled: shouldFetch });
  const { pathname } = useLocation();
  const [{ query }] = useQueryParams();
  const { formatMessage } = useIntl();

  const allAscendants = data && getFolderParents(data, currentFolderId);
  const filteredAscendants =
    allAscendants &&
    allAscendants.filter(
      (ascendant) => !parentsToOmit.includes(ascendant.id) && ascendant.id !== null
    );

  return (
    <CrumbSimpleMenu
      onOpen={() => setShouldFetch(true)}
      onClose={() => setShouldFetch(false)}
      aria-label={formatMessage({
        id: getTrad('header.breadcrumbs.menu.label'),
        defaultMessage: 'Get more ascendants folders',
      })}
      label="..."
    >
      {isLoading && (
        <MenuItem>
          <Loader small>
            {formatMessage({
              id: getTrad('content.isLoading'),
              defaultMessage: 'Content is loading.',
            })}
          </Loader>
        </MenuItem>
      )}
      {filteredAscendants &&
        filteredAscendants.map((ascendant) => {
          if (onChangeFolder) {
            return (
              <MenuItem
                tag="button"
                type="button"
                onClick={() => onChangeFolder(ascendant.id, ascendant.path)}
                key={ascendant.id}
              >
                {ascendant.label}
              </MenuItem>
            );
          }

          const url = getFolderURL(pathname, query, {
            folder: ascendant?.id,
            folderPath: ascendant?.path,
          });

          return (
            <MenuItem isLink tag={NavLink} to={url} key={ascendant.id}>
              {ascendant.label}
            </MenuItem>
          );
        })}
    </CrumbSimpleMenu>
  );
};

CrumbSimpleMenuAsync.defaultProps = {
  currentFolderId: undefined,
  onChangeFolder: undefined,
  parentsToOmit: [],
};

CrumbSimpleMenuAsync.propTypes = {
  currentFolderId: PropTypes.number,
  onChangeFolder: PropTypes.func,
  parentsToOmit: PropTypes.arrayOf(PropTypes.number),
};
