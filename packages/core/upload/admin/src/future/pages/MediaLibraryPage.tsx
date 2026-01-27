import * as React from 'react';

import { Layouts, SearchInput } from '@strapi/admin/strapi-admin';
import { Box, Flex } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils';

export const MediaLibraryPage = () => {
  const { formatMessage } = useIntl();

  return (
    /**
     * NOTE:
     *
     * The design differs from our current Layouts component.
     * Either we find a way to make it work with our current Layouts component
     * or we will have to write our own custom layout.
     */
    <Layouts.Root>
      <Layouts.Header
        navigationAction={<Box>TODO: Breadcrumbs</Box>}
        title="TODO: Folder location"
        primaryAction={
          <Flex gap={2}>
            <SearchInput
              label={formatMessage({
                id: getTrad('search.label'),
                defaultMessage: 'Search for an asset',
              })}
              trackedEvent="didSearchMediaLibraryElements"
              trackedEventDetails={{ location: 'upload' }}
            />
            TODO: Toolbar
          </Flex>
        }
      />

      <Layouts.Content>TODO: List/Grid views</Layouts.Content>
    </Layouts.Root>
  );
};
