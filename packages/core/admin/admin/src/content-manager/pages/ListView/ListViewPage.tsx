import * as React from 'react';

import {
  ActionLayout,
  Button,
  ContentLayout,
  HeaderLayout,
  Flex,
  Typography,
  lightTheme,
  ButtonProps,
} from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import isEqual from 'lodash/isEqual';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { useNavigate, Link as ReactRouterLink } from 'react-router-dom';
import styled from 'styled-components';

import { InjectionZone } from '../../../components/InjectionZone';
import { Page } from '../../../components/PageHelpers';
import { Pagination } from '../../../components/Pagination';
import { SearchInput } from '../../../components/SearchInput';
import { Table } from '../../../components/Table';
import { HOOKS } from '../../../constants';
import { BackButton } from '../../../features/BackButton';
import { useNotification } from '../../../features/Notifications';
import { useStrapiApp } from '../../../features/StrapiApp';
import { useTracking } from '../../../features/Tracking';
import { useAPIErrorHandler } from '../../../hooks/useAPIErrorHandler';
import { useEnterprise } from '../../../hooks/useEnterprise';
import { useQueryParams } from '../../../hooks/useQueryParams';
import { getDisplayName } from '../../../utils/users';
import { DocumentRBAC, useDocumentRBAC } from '../../features/DocumentRBAC';
import { useDoc } from '../../hooks/useDocument';
import {
  ListFieldLayout,
  convertListLayoutToFieldLayouts,
  useDocumentLayout,
} from '../../hooks/useDocumentLayout';
import { usePrev } from '../../hooks/usePrev';
import { useSyncRbac } from '../../hooks/useSyncRbac';
import { useGetAllDocumentsQuery } from '../../services/documents';
import { buildValidParams } from '../../utils/api';
import { getTranslation } from '../../utils/translations';
import { DocumentStatus } from '../EditView/components/DocumentStatus';

import { Filters } from './components/Filters';
import { TableActions } from './components/TableActions';
import { CellContent } from './components/TableCells/CellContent';
import { ViewSettingsMenu } from './components/ViewSettingsMenu';

import type { Modules } from '@strapi/types';

const { INJECT_COLUMN_IN_TABLE } = HOOKS;
const REVIEW_WORKFLOW_COLUMNS_CE = null;
const REVIEW_WORKFLOW_COLUMNS_CELL_CE = {
  ReviewWorkflowsStageEE: () => null,
  ReviewWorkflowsAssigneeEE: () => null,
};

/* -------------------------------------------------------------------------------------------------
 * ListViewPage
 * -----------------------------------------------------------------------------------------------*/

const ListViewPage = () => {
  const { trackUsage } = useTracking();
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler(getTranslation);

  const { collectionType, model, schema } = useDoc();
  const { list } = useDocumentLayout(model);

  const [displayedHeaders, setDisplayedHeaders] = React.useState<ListFieldLayout[]>([]);

  const listLayout = usePrev(list.layout);
  React.useEffect(() => {
    /**
     * ONLY update the displayedHeaders if the document
     * layout has actually changed in value.
     */
    if (!isEqual(listLayout, list.layout)) {
      setDisplayedHeaders(list.layout);
    }
  }, [list.layout, listLayout]);

  const handleSetHeaders = (headers: string[]) => {
    setDisplayedHeaders(
      convertListLayoutToFieldLayouts(headers, schema!.attributes, list.metadatas)
    );
  };

  const [{ query }] = useQueryParams<{
    plugins?: Record<string, unknown>;
    page?: string;
    pageSize?: string;
    sort?: string;
  }>({
    page: '1',
    pageSize: list.settings.pageSize.toString(),
    sort: list.settings.defaultSortBy
      ? `${list.settings.defaultSortBy}:${list.settings.defaultSortOrder}`
      : '',
  });

  const params = React.useMemo(() => buildValidParams(query), [query]);
  const { data, error, isLoading } = useGetAllDocumentsQuery({
    model,
    params,
  });

  /**
   * If the API returns an error, display a notification
   */
  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  const { results = [], pagination } = data ?? {};

  React.useEffect(() => {
    if (pagination && pagination.pageCount > 0 && pagination.page > pagination.pageCount) {
      navigate(
        {
          search: stringify({
            ...query,
            page: pagination.pageCount,
          }),
        },
        { replace: true }
      );
    }
  }, [pagination, formatMessage, query, navigate]);

  const { canCreate } = useDocumentRBAC('ListViewPage', ({ canCreate }) => ({
    canCreate,
  }));

  /* -------------------------------------------------------------------------------------------------
   * Create all our table headers and run the hook for plugins to inject.
   * -----------------------------------------------------------------------------------------------*/
  const reviewWorkflowColumns = useEnterprise(
    REVIEW_WORKFLOW_COLUMNS_CE,
    async () =>
      (await import('../../../../../ee/admin/src/content-manager/pages/ListView/constants'))
        .REVIEW_WORKFLOW_COLUMNS_EE,
    {
      enabled: !!schema?.options?.reviewWorkflows,
    }
  );
  const ReviewWorkflowsColumns = useEnterprise(
    REVIEW_WORKFLOW_COLUMNS_CELL_CE,
    async () => {
      const { ReviewWorkflowsStageEE, ReviewWorkflowsAssigneeEE } = await import(
        '../../../../../ee/admin/src/content-manager/pages/ListView/components/ReviewWorkflowsColumn'
      );
      return { ReviewWorkflowsStageEE, ReviewWorkflowsAssigneeEE };
    },
    {
      enabled: !!schema?.options?.reviewWorkflows,
    }
  );

  const runHookWaterfall = useStrapiApp('ListViewPage', ({ runHookWaterfall }) => runHookWaterfall);
  /**
   * Run the waterfall and then inject our additional table headers.
   */
  const tableHeaders = React.useMemo(() => {
    const headers = runHookWaterfall(INJECT_COLUMN_IN_TABLE, {
      displayedHeaders,
      layout: list,
    });

    const formattedHeaders = headers.displayedHeaders.map<ListFieldLayout>((header) => {
      return {
        ...header,
        label: typeof header.label === 'string' ? header.label : formatMessage(header.label),
        name: `${header.name}${header.mainField ? `.${header.mainField}` : ''}`,
      };
    });

    if (schema?.options?.draftAndPublish) {
      formattedHeaders.push({
        attribute: {
          type: 'custom',
        },
        name: 'status',
        label: formatMessage({
          id: getTranslation(`containers.list.table-headers.status`),
          defaultMessage: 'status',
        }),
        searchable: false,
        sortable: false,
      } satisfies ListFieldLayout);
    }

    if (reviewWorkflowColumns) {
      formattedHeaders.push(
        ...reviewWorkflowColumns.map((column) => ({
          ...column,
          label: formatMessage(column.label),
        }))
      );
    }
    return formattedHeaders;
  }, [
    displayedHeaders,
    formatMessage,
    list,
    reviewWorkflowColumns,
    runHookWaterfall,
    schema?.options?.draftAndPublish,
  ]);

  if (isLoading) {
    return <Page.Loading />;
  }

  if (error) {
    return <Page.Error />;
  }

  const contentTypeTitle = schema?.info.displayName ?? 'Untitled';

  const handleRowClick = (id: Modules.Documents.ID) => () => {
    trackUsage('willEditEntryFromList');
    navigate({
      pathname: id.toString(),
      search: stringify({ plugins: query.plugins }),
    });
  };

  return (
    <Page.Main>
      <Page.Title>{`${contentTypeTitle}`}</Page.Title>
      <HeaderLayout
        primaryAction={canCreate ? <CreateButton /> : null}
        subtitle={formatMessage(
          {
            id: getTranslation('pages.ListView.header-subtitle'),
            defaultMessage:
              '{number, plural, =0 {# entries} one {# entry} other {# entries}} found',
          },
          { number: pagination?.total }
        )}
        title={contentTypeTitle}
        navigationAction={<BackButton />}
      />
      <ActionLayout
        endActions={
          <>
            <InjectionZone area="contentManager.listView.actions" />
            <ViewSettingsMenu
              setHeaders={handleSetHeaders}
              resetHeaders={() => setDisplayedHeaders(list.layout)}
              headers={displayedHeaders.map((header) => header.name)}
            />
          </>
        }
        startActions={
          <>
            {list.settings.searchable && (
              <SearchInput
                disabled={results.length === 0}
                label={formatMessage(
                  { id: 'app.component.search.label', defaultMessage: 'Search for {target}' },
                  { target: contentTypeTitle }
                )}
                placeholder={formatMessage({
                  id: 'global.search',
                  defaultMessage: 'Search',
                })}
                trackedEvent="didSearch"
              />
            )}
            {list.settings.filterable && schema ? (
              <Filters disabled={results.length === 0} schema={schema} />
            ) : null}
          </>
        }
      />
      <ContentLayout>
        <Flex gap={4} direction="column" alignItems="stretch">
          <Table.Root rows={results} headers={tableHeaders} isLoading={isLoading}>
            <Table.ActionBar />
            <Table.Content>
              <Table.Head>
                <Table.HeaderCheckboxCell />
                {tableHeaders.map((header: ListFieldLayout) => (
                  <Table.HeaderCell key={header.name} {...header} />
                ))}
              </Table.Head>
              <Table.Loading />
              <Table.Empty action={canCreate ? <CreateButton variant="secondary" /> : null} />
              <Table.Body>
                {results.map((row) => {
                  return (
                    <Table.Row
                      cursor="pointer"
                      key={row.id}
                      onClick={handleRowClick(row.documentId)}
                    >
                      <Table.CheckboxCell id={row.id} />
                      {tableHeaders.map(({ cellFormatter, ...header }) => {
                        if (header.name === 'status') {
                          const { status } = row;

                          return (
                            <Table.Cell key={header.name}>
                              <DocumentStatus status={status} maxWidth={'min-content'} />
                            </Table.Cell>
                          );
                        }
                        if (schema?.options?.reviewWorkflows) {
                          if (header.name === 'strapi_stage') {
                            return (
                              <Table.Cell key={header.name}>
                                {row.strapi_stage ? (
                                  <ReviewWorkflowsColumns.ReviewWorkflowsStageEE
                                    color={row.strapi_stage.color ?? lightTheme.colors.primary600}
                                    name={row.strapi_stage.name}
                                  />
                                ) : (
                                  <Typography textColor="neutral800">-</Typography>
                                )}
                              </Table.Cell>
                            );
                          }
                          if (header.name === 'strapi_assignee') {
                            return (
                              <Table.Cell key={header.name}>
                                {row.strapi_assignee ? (
                                  <ReviewWorkflowsColumns.ReviewWorkflowsAssigneeEE
                                    user={row.strapi_assignee}
                                  />
                                ) : (
                                  <Typography textColor="neutral800">-</Typography>
                                )}
                              </Table.Cell>
                            );
                          }
                        }
                        if (['createdBy', 'updatedBy'].includes(header.name.split('.')[0])) {
                          // Display the users full name
                          // Some entries doesn't have a user assigned as creator/updater (ex: entries created through content API)
                          // In this case, we display a dash
                          return (
                            <Table.Cell key={header.name}>
                              <Typography textColor="neutral800">
                                {row[header.name.split('.')[0]]
                                  ? getDisplayName(row[header.name.split('.')[0]], formatMessage)
                                  : '-'}
                              </Typography>
                            </Table.Cell>
                          );
                        }
                        if (typeof cellFormatter === 'function') {
                          return (
                            <Table.Cell key={header.name}>
                              {/* @ts-expect-error – TODO: fix this TS error */}
                              {cellFormatter(row, header, { collectionType, model })}
                            </Table.Cell>
                          );
                        }
                        return (
                          <Table.Cell key={header.name}>
                            <CellContent
                              content={row[header.name.split('.')[0]]}
                              rowId={row.documentId}
                              {...header}
                            />
                          </Table.Cell>
                        );
                      })}
                      {/* we stop propogation here to allow the menu to trigger it's events without triggering the row redirect */}
                      <ActionsCell onClick={(e) => e.stopPropagation()}>
                        <TableActions document={row} />
                      </ActionsCell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.Root>
          <Pagination.Root
            {...pagination}
            onPageSizeChange={() => trackUsage('willChangeNumberOfEntriesPerPage')}
          >
            <Pagination.PageSize />
            <Pagination.Links />
          </Pagination.Root>
        </Flex>
      </ContentLayout>
    </Page.Main>
  );
};

const ActionsCell = styled(Table.Cell)`
  display: flex;
  justify-content: flex-end;
`;

/* -------------------------------------------------------------------------------------------------
 * CreateButton
 * -----------------------------------------------------------------------------------------------*/

interface CreateButtonProps extends Pick<ButtonProps, 'variant'> {}

const CreateButton = ({ variant }: CreateButtonProps) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const [{ query }] = useQueryParams<{ plugins: object }>();

  return (
    <Button
      variant={variant}
      forwardedAs={ReactRouterLink}
      onClick={() => {
        trackUsage('willCreateEntry', { status: 'draft' });
      }}
      startIcon={<Plus />}
      style={{ textDecoration: 'none' }}
      // @ts-expect-error – DS inference does not work with as or forwardedAs
      to={{
        pathname: 'create',
        search: stringify({ plugins: query.plugins }),
      }}
    >
      {formatMessage({
        id: getTranslation('HeaderLayout.button.label-add-entry'),
        defaultMessage: 'Create new entry',
      })}
    </Button>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ProtectedListViewPage
 * -----------------------------------------------------------------------------------------------*/

const ProtectedListViewPage = () => {
  const { model } = useDoc();
  const [{ query }] = useQueryParams();
  const { permissions = [], isLoading, isError } = useSyncRbac(model, query, 'editView');

  if (isLoading) {
    return <Page.Loading />;
  }

  if (isError) {
    return <Page.Error />;
  }

  return (
    <Page.Protect permissions={permissions}>
      {({ permissions }) => (
        <DocumentRBAC permissions={permissions}>
          <ListViewPage />
        </DocumentRBAC>
      )}
    </Page.Protect>
  );
};

export { ListViewPage, ProtectedListViewPage };
