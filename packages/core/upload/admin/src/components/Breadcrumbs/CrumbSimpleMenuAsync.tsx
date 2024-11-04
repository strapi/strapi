import * as React from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { CrumbSimpleMenu, Loader, MenuItem } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';

import { useFolderStructure } from '../../hooks/useFolderStructure';
import { getFolderParents, getFolderURL, getTrad } from '../../utils';

interface CrumbSimpleMenuAsyncProps {
  parentsToOmit?: number[];
  currentFolderId?: number;
  onChangeFolder?: (id: number, path?: string) => void;
}

export const CrumbSimpleMenuAsync = ({
  parentsToOmit = [],
  currentFolderId,
  onChangeFolder,
}: CrumbSimpleMenuAsyncProps) => {
  const [shouldFetch, setShouldFetch] = React.useState(false);
  const { data, isLoading } = useFolderStructure({ enabled: shouldFetch });
  const { pathname } = useLocation();
  const [{ query }] = useQueryParams();
  const { formatMessage } = useIntl();

  const allAscendants = data && getFolderParents(data, currentFolderId!);
  const filteredAscendants =
    allAscendants &&
    allAscendants.filter(
      (ascendant) =>
        typeof ascendant.id === 'number' &&
        !parentsToOmit.includes(ascendant.id) &&
        ascendant.id !== null
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
                onClick={() => onChangeFolder(Number(ascendant.id), ascendant.path)}
                key={ascendant.id}
              >
                {ascendant.label}
              </MenuItem>
            );
          }

          const url = getFolderURL(pathname, query, {
            folder: typeof ascendant?.id === 'string' ? ascendant.id : undefined,
            folderPath: ascendant?.path,
          });

          return (
            <MenuItem isLink href={url} key={ascendant.id}>
              {ascendant.label}
            </MenuItem>
          );
        })}
    </CrumbSimpleMenu>
  );
};
