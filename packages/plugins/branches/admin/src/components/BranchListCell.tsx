import { Flex, Status, Tooltip, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useGetBranchStatesQuery } from '../services/branches';
import { getTranslation } from '../utils/getTranslation';
import { BranchDot } from './BranchDot';
import { useBranches } from './useBranches';

import type { ListFieldLayout, ListLayout } from '@strapi/content-manager/strapi-admin';

interface BranchListCellProps {
  documentId: string;
  model: string;
}

/**
 * List-view cell. On a branch: the document's state there. On main: the
 * active branches that carry changes for the document (the user's "part of
 * branches A, B and C" column).
 */
const BranchListCell = ({ documentId, model }: BranchListCellProps) => {
  const { formatMessage } = useIntl();
  const { isOnMain, others } = useBranches();
  const { data } = useGetBranchStatesQuery(
    { contentType: model, documentIds: [documentId] },
    { skip: !documentId || others.length === 0 }
  );
  const info = data?.[documentId];

  if (!info) {
    return <Typography textColor="neutral600">—</Typography>;
  }

  if (!isOnMain) {
    if (info.state === 'created') {
      return (
        <Status variant="success" size="S">
          <Typography tag="span" variant="omega" fontWeight="bold">
            {formatMessage({ id: getTranslation('list.cell.created'), defaultMessage: 'New' })}
          </Typography>
        </Status>
      );
    }
    if (info.state === 'modified') {
      return (
        <Tooltip label={info.attributes.join(', ')}>
          <Status variant="alternative" size="S">
            <Typography tag="span" variant="omega" fontWeight="bold">
              {formatMessage({
                id: getTranslation('list.cell.modified'),
                defaultMessage: 'Modified',
              })}
            </Typography>
          </Status>
        </Tooltip>
      );
    }
    return <Typography textColor="neutral600">—</Typography>;
  }

  if (info.branches.length === 0) {
    return <Typography textColor="neutral600">—</Typography>;
  }

  return (
    <Tooltip label={info.branches.map((branch) => branch.name).join(', ')}>
      <Flex gap={1} alignItems="center">
        {info.branches.slice(0, 3).map((branch) => (
          <BranchDot key={branch.id} color={branch.color} />
        ))}
        <Typography variant="pi" textColor="neutral700">
          {info.branches.length === 1
            ? info.branches[0].name
            : formatMessage(
                {
                  id: getTranslation('list.cell.inBranches'),
                  defaultMessage: '{count, plural, one {In # branch} other {In # branches}}',
                },
                { count: info.branches.length }
              )}
        </Typography>
      </Flex>
    </Tooltip>
  );
};

interface AddColumnToTableHookArgs {
  layout: ListLayout;
  displayedHeaders: ListFieldLayout[];
}

/** `Admin/CM/pages/ListView/inject-column-in-table` hook, the seam i18n uses. */
const addBranchColumnHook = ({ displayedHeaders, layout }: AddColumnToTableHookArgs) => ({
  displayedHeaders: [
    ...displayedHeaders,
    {
      attribute: { type: 'string' },
      label: {
        id: getTranslation('list.column.label'),
        defaultMessage: 'Branch',
      },
      searchable: false,
      sortable: false,
      name: 'branch',
      // @ts-expect-error – the CM's cellFormatter types the row loosely
      cellFormatter: (props, _header, meta) => (
        <BranchListCell documentId={props.documentId} model={meta.model} />
      ),
    },
  ],
  layout,
});

export { BranchListCell, addBranchColumnHook };
