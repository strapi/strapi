import * as React from 'react';

import { Box, EmptyStateLayout, LinkButton } from '@strapi/design-system';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { ContentPermission } from '../../../../../../../shared/contracts/permissions';
import { useAppInfo } from '../../../../../features/AppInfo';
import { useRBAC } from '../../../../../hooks/useRBAC';
import { normalizeSearch, subjectMatchesSearch } from '../utils/search';

import { ContentTypeCollapses } from './ContentTypeCollapses';
import { GlobalActions, GlobalActionsProps } from './GlobalActions';
import { NoSearchResults, PermissionsSearch } from './PermissionsSearch';

import type { PermissionsProps } from './Permissions';

interface ContentTypesProps
  extends
    Pick<GlobalActionsProps, 'kind'>,
    Pick<
      PermissionsProps,
      | 'onOpenSubjectChange'
      | 'renderActionIndicator'
      | 'renderSubjectActions'
      | 'renderSubjectDetails'
      | 'requiredFieldsAction'
      | 'searchable'
    > {
  isFormDisabled?: boolean;
  layout: ContentPermission;
}

const CONTENT_TYPE_BUILDER_READ = [{ action: 'plugin::content-type-builder.read', subject: null }];

/**
 * What a tab with no content type of its kind shows. The way to make one, a link to the
 * Content-Type Builder, is there only for an admin who can open the builder, and only while the
 * server auto-reloads: the builder is read-only anywhere else.
 */
const NoContentTypes = ({ kind }: Pick<ContentTypesProps, 'kind'>) => {
  const { formatMessage } = useIntl();
  const autoReload = useAppInfo('NoContentTypes', (state) => state.autoReload);
  const {
    allowedActions: { canRead },
  } = useRBAC(CONTENT_TYPE_BUILDER_READ);

  return (
    <EmptyStateLayout
      icon={<EmptyDocuments width="16rem" />}
      content={
        kind === 'collectionTypes'
          ? formatMessage({
              id: 'Settings.permissions.empty.collection-types',
              defaultMessage: 'No collection types yet',
            })
          : formatMessage({
              id: 'Settings.permissions.empty.single-types',
              defaultMessage: 'No single types yet',
            })
      }
      action={
        autoReload && canRead ? (
          <LinkButton tag={Link} variant="secondary" to="/plugins/content-type-builder">
            {formatMessage({
              id: 'Settings.permissions.empty.content-type-builder',
              defaultMessage: 'Open the Content-Type Builder',
            })}
          </LinkButton>
        ) : undefined
      }
    />
  );
};

/** Keeps what is wider than the card inside it, scrolling sideways; passes the table through when off */
const ScrollWithinCard = ({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) =>
  enabled ? (
    <div data-testid="permissions-scroll" style={{ overflowX: 'auto' }}>
      {children}
    </div>
  ) : (
    <>{children}</>
  );

const ContentTypes = ({
  isFormDisabled,
  kind,
  layout: { actions, subjects },
  onOpenSubjectChange,
  renderActionIndicator,
  renderSubjectActions,
  renderSubjectDetails,
  requiredFieldsAction,
  searchable = false,
}: ContentTypesProps) => {
  const [query, setQuery] = React.useState('');
  const search = searchable ? normalizeSearch(query) : '';

  const sortedSubjects = React.useMemo(
    () => [...subjects].sort((a, b) => a.label.localeCompare(b.label)),
    [subjects]
  );
  const listedSubjects = React.useMemo(
    () =>
      search
        ? sortedSubjects.filter((subject) => subjectMatchesSearch(subject, search))
        : sortedSubjects,
    [sortedSubjects, search]
  );
  const listedUids = React.useMemo(
    () => (search ? listedSubjects.map(({ uid }) => uid) : undefined),
    [search, listedSubjects]
  );

  // Nothing to search or to tick: no search box either
  if (subjects.length === 0) {
    return (
      <Box background="neutral0">
        <NoContentTypes kind={kind} />
      </Box>
    );
  }

  return (
    <Box background="neutral0">
      {searchable && (
        <Box paddingTop={4} paddingLeft={6} paddingRight={6}>
          <PermissionsSearch kind="contentTypes" value={query} onChange={setQuery} />
        </Box>
      )}
      {/*
        With a trailing cell the rows are wider than the card on a laptop screen: the column
        headings and the rows scroll together inside it instead of past its edge. Without one the
        table is laid out as it always was.
      */}
      <ScrollWithinCard enabled={renderSubjectActions !== undefined}>
        {search && listedSubjects.length === 0 ? (
          <NoSearchResults kind="contentTypes" query={query} />
        ) : (
          <GlobalActions
            actions={actions}
            kind={kind}
            isFormDisabled={isFormDisabled}
            listedSubjects={listedUids}
          />
        )}
        {/* Mounted while the search leaves nothing too, so the content type that was open stays so */}
        <ContentTypeCollapses
          actions={actions}
          isFormDisabled={isFormDisabled}
          kind={kind}
          onOpenSubjectChange={onOpenSubjectChange}
          pathToData={kind}
          renderActionIndicator={renderActionIndicator}
          renderSubjectActions={renderSubjectActions}
          renderSubjectDetails={renderSubjectDetails}
          requiredFieldsAction={requiredFieldsAction}
          search={search || undefined}
          subjects={listedSubjects}
        />
      </ScrollWithinCard>
    </Box>
  );
};

export { ContentTypes };
