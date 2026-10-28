import * as React from 'react';

import { useAuth } from '@strapi/admin/strapi-admin';
import { IconButton } from '@strapi/design-system';
import { Pencil } from '@strapi/icons';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import type { Struct, UID } from '@strapi/types';

interface EntryLocation {
  contentTypeUid: UID.ContentType;
  kind?: Struct.ContentTypeKind;
  documentId: string;
  locale?: string | null;
  showErrors?: boolean;
}

/**
 * Whether the user can read the entry in the Content Manager, in that locale
 */
const useCanReadEntry = ({
  contentTypeUid,
  locale,
}: Pick<EntryLocation, 'contentTypeUid' | 'locale'>) => {
  const permissions = useAuth('useCanReadEntry', (state) => state.permissions);

  return React.useMemo(
    () =>
      permissions.some(
        (permission) =>
          permission.subject === contentTypeUid &&
          permission.action === 'plugin::content-manager.explorer.read' &&
          (!locale || Boolean(permission.properties?.locales?.includes(locale)))
      ),
    [contentTypeUid, locale, permissions]
  );
};

// Where a `Link` opens the entry in the Content Manager
const getEntryLinkProps = ({
  contentTypeUid,
  kind,
  documentId,
  locale,
  showErrors = false,
}: EntryLocation) => ({
  to: {
    pathname: `/content-manager/${kind === 'singleType' ? 'single-types' : 'collection-types'}/${contentTypeUid}${kind === 'singleType' ? '' : `/${documentId}`}`,
    search: locale ? stringify({ plugins: { i18n: { locale } } }) : '',
  },
  state: showErrors ? { forceValidation: true } : undefined,
});

/**
 * Opens the entry in the Content Manager, for a user allowed to read it in that locale
 */
const EntryLinkButton = (props: EntryLocation) => {
  const { formatMessage } = useIntl();
  const canReadEntry = useCanReadEntry(props);

  if (!canReadEntry) {
    return null;
  }

  return (
    <IconButton
      tag={Link}
      {...getEntryLinkProps(props)}
      label={formatMessage({
        id: 'content-releases.pages.ReleaseDetails.table.open-entry',
        defaultMessage: 'Open entry',
      })}
      variant="ghost"
    >
      <Pencil />
    </IconButton>
  );
};

export { EntryLinkButton, getEntryLinkProps, useCanReadEntry };
export type { EntryLocation };
