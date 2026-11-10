import * as React from 'react';

import { Layouts, Page, useAppInfo, useRBAC } from '@strapi/admin/strapi-admin';
import {
  Alert,
  Badge,
  Flex,
  IconButton,
  LinkButton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Eye, Information, Pencil, Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link, useNavigate } from 'react-router-dom';

import { PERMISSIONS } from '../../constants';
import { useGetConditionsQuery } from '../../services/conditions';
import { useGetPermissionLayoutQuery } from '../../services/permissions';
import { getTranslation } from '../../utils/getTranslation';

import { SOURCE_LABELS } from './utils/sourceLabels';

import type { ConditionListItem } from '../../../../shared/contracts/conditions';

/** The builder names its conditions `api::<slug>`, and its pages are addressed by the slug. */
const BUILDER_NAME_PREFIX = 'api::';

/** How many content types the list names before it says how many more there are. */
const MAX_CONTENT_TYPES = 2;

/** The slug of the builder condition the builder opens, or `undefined` when it has no builder */
const getBuilderSlug = (condition: ConditionListItem) =>
  condition.source === 'builder' && condition.name.startsWith(BUILDER_NAME_PREFIX)
    ? condition.name.slice(BUILDER_NAME_PREFIX.length)
    : undefined;

/** Every condition without a builder opens the read-only page, which takes its name as it is */
const getViewPath = (condition: ConditionListItem) => `view/${encodeURIComponent(condition.name)}`;

/** The content types of a condition by their display names, as its own page lists them */
const ContentTypes = ({
  subjects,
  labels,
}: {
  subjects: string[];
  labels: Map<string, string>;
}) => {
  const { formatMessage } = useIntl();

  if (subjects.length === 0) {
    return (
      <Typography textColor="neutral600">
        {formatMessage({
          id: getTranslation('conditions.list.no-content-types'),
          defaultMessage: 'None',
        })}
      </Typography>
    );
  }

  // A content type the layout does not know (it was removed) keeps its uid
  const names = subjects.map((uid) => labels.get(uid) ?? uid);
  const shown = names.slice(0, MAX_CONTENT_TYPES).join(', ');
  const more = names.length - MAX_CONTENT_TYPES;

  return (
    // The whole list is the tooltip of the shortened one
    <Typography ellipsis textColor="neutral800" title={names.join(', ')}>
      {more > 0
        ? formatMessage(
            {
              id: getTranslation('conditions.list.content-types-more'),
              defaultMessage: '{shown} and {count} more',
            },
            { shown, count: more }
          )
        : shown}
    </Typography>
  );
};

const ListPage = () => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const autoReload = useAppInfo('ConditionsListPage', (state) => state.autoReload) === true;
  const {
    isLoading: isLoadingPermissions,
    allowedActions: { canUpdate },
  } = useRBAC(PERMISSIONS.conditions);
  const { data: conditions, isLoading, error } = useGetConditionsQuery();
  const { data: layout, isLoading: isLoadingLayout } = useGetPermissionLayoutQuery();

  if (isLoading || isLoadingPermissions || isLoadingLayout) {
    return <Page.Loading />;
  }

  if (error || !conditions) {
    return <Page.Error />;
  }

  const labels = new Map((layout?.contentTypes ?? []).map(({ uid, label }) => [uid, label]));
  const staleCount = conditions.filter((condition) => (condition.stale?.length ?? 0) > 0).length;

  const title = formatMessage({
    id: getTranslation('conditions.list.title'),
    defaultMessage: 'Conditions',
  });

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings — {name}' },
          { name: title }
        )}
      </Page.Title>
      <Layouts.Header
        primaryAction={
          autoReload && canUpdate ? (
            <LinkButton tag={Link} to="new" startIcon={<Plus />} size="S">
              {formatMessage({
                id: getTranslation('conditions.list.add'),
                defaultMessage: 'New condition',
              })}
            </LinkButton>
          ) : null
        }
        title={title}
        subtitle={formatMessage({
          id: getTranslation('conditions.list.subtitle'),
          defaultMessage: 'List of conditions',
        })}
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={4}>
          {!autoReload && (
            <Flex gap={3} padding={4} background="neutral100" borderColor="neutral200" hasRadius>
              <Information fill="neutral600" aria-hidden />
              <Typography textColor="neutral800">
                {formatMessage(
                  {
                    id: getTranslation('conditions.list.development-only'),
                    defaultMessage:
                      'Conditions can be created and changed only while Strapi runs with <code>strapi develop</code>.',
                  },
                  { code: (chunks: React.ReactNode) => <code>{chunks}</code> }
                )}
              </Typography>
            </Flex>
          )}
          {staleCount > 0 && (
            <Alert
              variant="danger"
              closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
            >
              {formatMessage(
                {
                  id: getTranslation('conditions.list.stale'),
                  defaultMessage:
                    "{count, plural, one {# condition refers} other {# conditions refer}} to content types or fields that no longer exist. They deny everything until they're fixed.",
                },
                { count: staleCount }
              )}
            </Alert>
          )}
          <Table colCount={5} rowCount={conditions.length + 1}>
            <Thead>
              <Tr>
                <Th>
                  <Typography variant="sigma" textColor="neutral600">
                    {formatMessage({ id: 'global.name', defaultMessage: 'Name' })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma" textColor="neutral600">
                    {formatMessage({
                      id: getTranslation('conditions.list.content-types'),
                      defaultMessage: 'Content types',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma" textColor="neutral600">
                    {formatMessage({
                      id: getTranslation('conditions.list.source'),
                      defaultMessage: 'Source',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma" textColor="neutral600">
                    {formatMessage({
                      id: getTranslation('conditions.list.used-by'),
                      defaultMessage: 'Used by',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <VisuallyHidden>
                    {formatMessage({ id: 'global.actions', defaultMessage: 'Actions' })}
                  </VisuallyHidden>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {conditions.map((condition) => {
                const slug = getBuilderSlug(condition);
                // A builder condition opens the builder, the others their read-only page
                const path = slug ?? getViewPath(condition);
                // The builder opens read-only unless Strapi runs in development and the admin may update
                const canEdit = slug !== undefined && autoReload && canUpdate;

                return (
                  <Tr key={condition.name} cursor="pointer" onClick={() => navigate(path)}>
                    <Td maxWidth="16rem">
                      <Typography ellipsis textColor="neutral800">
                        {condition.displayName}
                      </Typography>
                    </Td>
                    <Td maxWidth="25rem">
                      <ContentTypes subjects={condition.subjects} labels={labels} />
                    </Td>
                    <Td>
                      <Flex gap={2}>
                        <Typography textColor="neutral800">
                          {formatMessage(SOURCE_LABELS[condition.source])}
                        </Typography>
                        {(condition.stale?.length ?? 0) > 0 && (
                          <Badge>
                            {formatMessage({
                              id: getTranslation('conditions.list.needs-fixing'),
                              defaultMessage: 'Needs fixing',
                            })}
                          </Badge>
                        )}
                      </Flex>
                    </Td>
                    <Td>
                      <Typography textColor="neutral800">
                        {formatMessage(
                          {
                            id: getTranslation('conditions.list.used-by.roles'),
                            defaultMessage: '{count, plural, one {# role} other {# roles}}',
                          },
                          { count: condition.usedBy }
                        )}
                      </Typography>
                    </Td>
                    <Td onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <Flex justifyContent="flex-end">
                        <IconButton
                          tag={Link}
                          to={path}
                          variant="ghost"
                          label={
                            canEdit
                              ? formatMessage(
                                  {
                                    id: 'app.component.table.edit',
                                    defaultMessage: 'Edit {target}',
                                  },
                                  { target: condition.displayName }
                                )
                              : formatMessage(
                                  {
                                    id: 'app.component.table.read',
                                    defaultMessage: 'Read {target}',
                                  },
                                  { target: condition.displayName }
                                )
                          }
                        >
                          {canEdit ? <Pencil /> : <Eye />}
                        </IconButton>
                      </Flex>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Flex>
      </Layouts.Content>
    </Page.Main>
  );
};

export { ListPage };
