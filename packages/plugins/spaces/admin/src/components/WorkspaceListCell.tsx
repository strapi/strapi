import { useIntl } from 'react-intl';

import { Flex, Typography } from '@strapi/design-system';

import { DEFAULT_SPACE_SLUG, getCurrentSpaceSlug } from '../utils/currentSpace';
import { getTranslation } from '../utils/getTranslation';
import { useInheritanceSummaries } from '../utils/inheritanceStates';
import { WorkspaceChip } from './WorkspaceChip';

import type { ListFieldLayout, ListLayout } from '@strapi/content-manager/strapi-admin';

interface SpacesLayoutOptions {
  enabled?: boolean;
  scope?: 'space' | 'platform' | 'none';
  sharedEntries?: boolean;
}

/**
 * The collection-type uid of a Content Manager list route.
 *
 * Matched with a regexp rather than `matchPath`: the admin is mounted under a
 * basename (`/admin` by default, configurable), so the real
 * `window.location.pathname` is `/admin/content-manager/collection-types/<uid>`
 * and a `matchPath('/content-manager/...')` pattern never matches it.
 */
const LIST_ROUTE_RE = /\/content-manager\/collection-types\/([^/?#]+)/;

export const getListRouteModel = (pathname: string): string | undefined =>
  LIST_ROUTE_RE.exec(pathname)?.[1];

/**
 * Whether the list view being rendered belongs to a content type whose entries
 * carry a workspace worth showing. The hook waterfalls receive the layout but
 * not the uid, so the uid comes from the list route.
 */
export const isWorkspaceColumnRelevant = (layout: ListLayout, pathname: string): boolean => {
  const model = getListRouteModel(pathname);
  const options = (layout.options as { spaces?: SpacesLayoutOptions } | undefined)?.spaces ?? {};

  if (options.enabled === false || options.scope === 'none' || options.scope === 'platform') {
    return false;
  }
  if (options.sharedEntries === true) {
    return false;
  }
  return options.scope === 'space' || Boolean(model?.startsWith('api::'));
};

interface WorkspaceListCellProps {
  space?: { slug: string; name: string; color: string | null } | null;
  model?: string;
  documentId?: string;
}

/**
 * "Workspace" cell of the list view (default workspace only).
 *
 * A shared entry is read by every workspace, so its workspace is not the
 * interesting part — what is, is how many of them have stopped reading it and
 * taken their own version. Asked in one batched request per page, and only for
 * the shared rows (see inheritanceStates.ts).
 */
export const WorkspaceListCell = ({ space, model, documentId }: WorkspaceListCellProps) => {
  const { formatMessage } = useIntl();
  const isShared = !space;
  const summaries = useInheritanceSummaries(
    isShared && model ? model : '',
    isShared && documentId ? [documentId] : []
  );
  const overridden = documentId ? (summaries[documentId]?.overriddenIn.length ?? 0) : 0;

  if (!isShared || overridden === 0) {
    return <WorkspaceChip space={space ?? null} />;
  }

  return (
    <Flex gap={1} alignItems="center">
      <WorkspaceChip space={null} />
      <Typography variant="pi" textColor="neutral500">
        {formatMessage(
          { id: getTranslation('list.column.overridden'), defaultMessage: '{count} overridden' },
          { count: overridden }
        )}
      </Typography>
    </Flex>
  );
};

interface AddColumnToTableHookArgs {
  layout: ListLayout;
  displayedHeaders: ListFieldLayout[];
}

/**
 * `Admin/CM/pages/ListView/inject-column-in-table`: in the default workspace,
 * which sees every entry, a "Workspace" column says where each one lives. The
 * list response already carries `space` (populated by the CM), so the cell
 * needs no extra request.
 */
export const addWorkspaceColumnHook = (
  { displayedHeaders, layout }: AddColumnToTableHookArgs,
  // The waterfall passes the Redux store here; tests pass a pathname.
  pathnameOverride?: unknown
) => {
  const pathname =
    typeof pathnameOverride === 'string' ? pathnameOverride : window.location.pathname;
  if (
    getCurrentSpaceSlug() !== DEFAULT_SPACE_SLUG ||
    !isWorkspaceColumnRelevant(layout, pathname)
  ) {
    return { displayedHeaders, layout };
  }

  return {
    displayedHeaders: [
      ...displayedHeaders,
      {
        attribute: { type: 'string' },
        label: {
          id: getTranslation('list.column.label'),
          defaultMessage: 'Workspace',
        },
        searchable: false,
        sortable: false,
        name: 'space',
        // @ts-expect-error – the CM's cellFormatter types the row loosely
        cellFormatter: (props) => (
          <WorkspaceListCell
            space={props.space}
            model={getListRouteModel(pathname)}
            documentId={props.documentId}
          />
        ),
      },
    ],
    layout,
  };
};
