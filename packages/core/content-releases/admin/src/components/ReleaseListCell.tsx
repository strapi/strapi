import * as React from 'react';

import { useTable, useQueryParams } from '@strapi/admin/strapi-admin';
import { ListFieldLayout, ListLayout } from '@strapi/content-manager/strapi-admin';
import { Box, Popover, Typography, Button, Link } from '@strapi/design-system';
import { CaretDown } from '@strapi/icons';
import { Modules, UID } from '@strapi/types';
import { useIntl } from 'react-intl';

import { useGetMappedEntriesInReleasesQuery } from '../services/release';

/* -------------------------------------------------------------------------------------------------
 * useReleasesList
 * -----------------------------------------------------------------------------------------------*/
interface QueryParams {
  plugins?: {
    i18n?: {
      locale: string;
    };
  };
}

const useReleasesList = (contentTypeUid: UID.ContentType, documentId: Modules.Documents.ID) => {
  const listViewData = useTable('ListView', (state) => state.rows);
  const documentIds = listViewData.map((entry) => entry.documentId);
  const [{ query }] = useQueryParams();
  const locale = (query as QueryParams)?.plugins?.i18n?.locale || undefined;

  const response = useGetMappedEntriesInReleasesQuery(
    { contentTypeUid, documentIds, locale },
    { skip: !documentIds || !contentTypeUid || documentIds.length === 0 }
  );

  const mappedEntriesInReleases = response.data || {};

  return mappedEntriesInReleases?.[documentId] || [];
};

/* -------------------------------------------------------------------------------------------------
 * addColumnToTableHook
 * -----------------------------------------------------------------------------------------------*/

interface AddColumnToTableHookArgs {
  layout: ListLayout;
  displayedHeaders: ListFieldLayout[];
}

const addColumnToTableHook = ({ displayedHeaders, layout }: AddColumnToTableHookArgs) => {
  const { options } = layout;

  if (!options?.draftAndPublish) {
    return { displayedHeaders, layout };
  }

  return {
    displayedHeaders: [
      ...displayedHeaders,
      {
        searchable: false,
        sortable: false,
        name: 'releases',
        label: {
          id: 'content-releases.content-manager.list-view.releases.header',
          defaultMessage: 'To be released in',
        },
        cellFormatter: (
          props: Modules.Documents.AnyDocument,
          _: any,
          { model }: { model: UID.ContentType }
        ) => <ReleaseListCell {...props} model={model} />,
      },
    ],
    layout,
  };
};

/* -------------------------------------------------------------------------------------------------
 * ReleaseListCell
 * -----------------------------------------------------------------------------------------------*/

interface ReleaseListCellProps extends Modules.Documents.AnyDocument {
  documentId: Modules.Documents.ID;
  model: UID.ContentType;
}

const ReleaseListCell = ({ documentId, model }: ReleaseListCellProps) => {
  const releases = useReleasesList(model, documentId);
  const { formatMessage } = useIntl();

  return (
    <Popover.Root>
      <Popover.Trigger>
        <Button
          variant="ghost"
          onClick={(e: React.MouseEvent<HTMLElement>) => e.stopPropagation()}
          // TODO: find a way in the DS to define the widht and height of the icon
          endIcon={releases.length > 0 ? <CaretDown width="1.2rem" height="1.2rem" /> : null}
        >
          <Typography
            style={{ maxWidth: '252px', cursor: 'pointer' }}
            textColor="neutral800"
            fontWeight="regular"
          >
            {releases.length > 0
              ? formatMessage(
                  {
                    id: 'content-releases.content-manager.list-view.releases-number',
                    defaultMessage: '{number} {number, plural, one {release} other {releases}}',
                  },
                  {
                    number: releases.length,
                  }
                )
              : '-'}
          </Typography>
        </Button>
      </Popover.Trigger>
      <Popover.Content>
        <ul>
          {releases.map(({ id, name }) => (
            <Box key={id} padding={3} tag="li">
              <Link href={`/admin/plugins/content-releases/${id}`} isExternal={false}>
                {name}
              </Link>
            </Box>
          ))}
        </ul>
      </Popover.Content>
    </Popover.Root>
  );
};

export { ReleaseListCell, addColumnToTableHook };
export type { ReleaseListCellProps };
