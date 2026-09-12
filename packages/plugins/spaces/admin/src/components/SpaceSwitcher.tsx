import * as React from 'react';

import {
  Badge,
  Box,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { ALL_SPACES } from '../constants';
import { getSelectedSpace, setSelectedSpace } from '../selectedSpace';
import { useGetMySpacesQuery } from '../services/api';
import { getTranslation } from '../utils/getTranslation';

/**
 * Lets an administrator choose which space they are working in, from the top of
 * the main navigation so it is visible wherever they are.
 *
 * Switching reloads the application. Almost every screen in the admin caches
 * content — lists, the entry being edited, the media library, permissions — and
 * all of it belongs to the space that was in force when it was fetched.
 * Reloading is the honest way to change that: it is one visible interruption
 * instead of a page that updates in pieces, some of it still showing the space
 * the user just left.
 */
const SpaceSwitcher = () => {
  const { formatMessage } = useIntl();
  const { data, isLoading } = useGetMySpacesQuery();

  const current = getSelectedSpace() ?? data?.current ?? null;

  const handleChange = (value: string | number) => {
    const slug = String(value);

    if (slug === current) {
      return;
    }

    setSelectedSpace(slug);
    window.location.reload();
  };

  if (isLoading || !data) {
    return null;
  }

  // A project with one space and no cross-space view has nothing to switch
  // between, and the switcher would only be noise.
  if (data.data.length <= 1 && !data.canAccessAll) {
    return null;
  }

  if (data.data.length === 0 && !data.canAccessAll) {
    return (
      <Box paddingBottom={2}>
        <Typography variant="pi" textColor="danger600">
          {data.unavailableReason ??
            formatMessage({
              id: getTranslation('switcher.none'),
              defaultMessage: 'You do not belong to any space.',
            })}
        </Typography>
      </Box>
    );
  }

  return (
    <Flex direction="column" alignItems="stretch" gap={1} paddingBottom={2}>
      <SingleSelect
        size="S"
        aria-label={formatMessage({
          id: getTranslation('switcher.label'),
          defaultMessage: 'Space',
        })}
        value={current ?? undefined}
        onChange={handleChange}
      >
        {data.canAccessAll ? (
          <SingleSelectOption value={ALL_SPACES}>
            {formatMessage({
              id: getTranslation('switcher.all'),
              defaultMessage: 'All spaces',
            })}
          </SingleSelectOption>
        ) : null}

        {data.data.map((space) => (
          <SingleSelectOption key={space.slug} value={space.slug}>
            {space.name}
          </SingleSelectOption>
        ))}
      </SingleSelect>

      {current === ALL_SPACES ? (
        <Badge textColor="warning700" backgroundColor="warning100">
          {formatMessage({
            id: getTranslation('switcher.all.hint'),
            defaultMessage: 'Viewing every space',
          })}
        </Badge>
      ) : null}
    </Flex>
  );
};

export { SpaceSwitcher };
