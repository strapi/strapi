import * as React from 'react';

import { BackButton, Layouts, Page } from '@strapi/admin/strapi-admin';
import { Box, EmptyStateLayout } from '@strapi/design-system';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';

import { getTranslation } from '../utils/getTranslation';

const KINDS = {
  role: {
    title: { id: getTranslation('roles.not-found.title'), defaultMessage: 'Role not found' },
    message: {
      id: getTranslation('roles.not-found.message'),
      defaultMessage: "This role doesn't exist. It may have been deleted.",
    },
  },
  condition: {
    title: {
      id: getTranslation('conditions.not-found.title'),
      defaultMessage: 'Condition not found',
    },
    message: {
      id: getTranslation('conditions.not-found.message'),
      defaultMessage: "This condition doesn't exist. It may have been deleted.",
    },
  },
} as const;

interface NotFoundProps {
  kind: keyof typeof KINDS;
  /** The list the page goes back to */
  backPath: string;
}

/** What a page shows for an id that has nothing behind it: its header and a way back, the same everywhere */
const NotFound = ({ kind, backPath }: NotFoundProps) => {
  const { formatMessage } = useIntl();
  const title = formatMessage(KINDS[kind].title);

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings — {name}' },
          { name: title }
        )}
      </Page.Title>
      <Layouts.Header
        title={title}
        navigationAction={
          <Box display={{ initial: 'none', medium: 'block' }}>
            <BackButton fallback={backPath} />
          </Box>
        }
      />
      <Layouts.Content>
        <EmptyStateLayout
          icon={<EmptyDocuments width="160px" />}
          content={formatMessage(KINDS[kind].message)}
        />
      </Layouts.Content>
    </Page.Main>
  );
};

export { NotFound };
