import * as React from 'react';

import { Layouts, SearchInput } from '@strapi/admin/strapi-admin';
import { Box, Button, Flex } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

import { getTrad } from '../../utils';
import { openUploadProgress } from '../store/uploadProgress';

export const MediaLibraryPage = () => {
  const { formatMessage } = useIntl();

  const dispatch = useDispatch();

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
            <Button onClick={() => dispatch(openUploadProgress())}>Simulate upload</Button>
            TODO: Toolbar
          </Flex>
        }
      />

      <Layouts.Content>TODO: List/Grid views</Layouts.Content>
    </Layouts.Root>
  );
};
