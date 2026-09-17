import * as React from 'react';

import {
  BackButton,
  ConfirmDialog,
  Layouts,
  Page,
  useAPIErrorHandler,
  useNotification,
  useRBAC,
} from '@strapi/admin/strapi-admin';
import {
  Alert,
  Badge,
  Box,
  Button,
  Dialog,
  EmptyStateLayout,
  Flex,
  IconButton,
  Status,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { ArrowsCounterClockwise, Cross, Eye, Trash } from '@strapi/icons';
import { stringify } from 'qs';
import { RelativeTime } from '@strapi/content-manager/strapi-admin';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';

import { DocumentDiffModal, type Resolution } from '../components/DocumentDiffModal';
import { useBranches } from '../components/useBranches';
import { MAIN_SLUG, PERMISSIONS } from '../constants';
import {
  useDeleteBranchMutation,
  useDiscardDocumentChangesMutation,
  useGetBranchChangesQuery,
  useGetBranchQuery,
  useMergeBranchMutation,
  useUpdateBranchMutation,
  type ChangeSummary,
  type MergeResolutions,
} from '../services/branches';
import { useContentTypeLabels } from '../services/contentTypes';
import { getTranslation } from '../utils/getTranslation';

type ResolutionState = Record<string, Record<string, Resolution>>; // docKey → attribute → choice

const docKeyOf = (change: Pick<ChangeSummary, 'contentType' | 'documentId' | 'locale'>) =>
  `${change.contentType}|${change.documentId}|${change.locale ?? ''}`;

const toMergeResolutions = (state: ResolutionState): MergeResolutions => {
  const out: MergeResolutions = {};
  for (const [key, byAttribute] of Object.entries(state)) {
    const [contentType, documentId, locale] = key.split('|');
    out[contentType] = out[contentType] ?? {};
    out[contentType][documentId] = out[contentType][documentId] ?? {};
    out[contentType][documentId][locale] = { ...byAttribute };
  }
  return out;
};

/** `/content-manager/plugins/branches/:id` — what the branch changed, conflict resolution, merge. */
const BranchPage = () => {
  const { id: rawId } = useParams<{ id: string }>();
  const id = Number(rawId);
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { allowedActions } = useRBAC(PERMISSIONS);
  const { branches, currentSlug, switchBranch, main } = useBranches();
  const { label: contentTypeLabel, kind: contentTypeKind } = useContentTypeLabels();

  const { data: branch, isLoading: isBranchLoading } = useGetBranchQuery(id, { skip: !id });
  const { data: changes, isLoading: areChangesLoading } = useGetBranchChangesQuery(id, {
    skip: !id,
  });
  const [mergeBranch, { isLoading: isMerging }] = useMergeBranchMutation();
  const [deleteBranch] = useDeleteBranchMutation();
  const [updateBranch] = useUpdateBranchMutation();
  const [discardChanges] = useDiscardDocumentChangesMutation();

  const [resolutions, setResolutions] = React.useState<ResolutionState>({});
  const [openDiff, setOpenDiff] = React.useState<ChangeSummary | null>(null);
  const [confirmMerge, setConfirmMerge] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [toDiscard, setToDiscard] = React.useState<ChangeSummary | null>(null);

  if (!id || isBranchLoading || areChangesLoading) {
    return <Page.Loading />;
  }
  if (!branch) {
    return <Page.Error />;
  }

  const parentBranch = branch.parent
    ? (branches.find((candidate) => candidate.id === branch.parent?.id) ?? null)
    : null;
  const parentName =
    parentBranch?.name ??
    branch.parent?.name ??
    main?.name ??
    formatMessage({ id: getTranslation('main.name'), defaultMessage: 'Main' });
  const parentSlug = parentBranch?.slug ?? branch.parent?.slug ?? MAIN_SLUG;

  const list = changes?.changes ?? [];
  const counts = changes?.counts ?? { create: 0, update: 0, delete: 0, conflicts: 0 };
  const unresolved = list.reduce(
    (sum, change) =>
      sum +
      change.conflicts.filter((attribute) => !resolutions[docKeyOf(change)]?.[attribute]).length,
    0
  );
  const isActive = branch.status === 'active';
  const canMerge = isActive && list.length > 0 && unresolved === 0 && allowedActions.canMerge;

  const resolveAll = (choice: Resolution) => {
    const next: ResolutionState = {};
    for (const change of list) {
      if (change.conflicts.length === 0) {
        continue;
      }
      next[docKeyOf(change)] = Object.fromEntries(
        change.conflicts.map((attribute) => [attribute, choice])
      );
    }
    setResolutions(next);
  };

  const openDocument = (change: ChangeSummary) => {
    if (currentSlug !== branch.slug) {
      switchBranch(branch.slug);
    }
    const search = change.locale
      ? `?${stringify({ plugins: { i18n: { locale: change.locale } } })}`
      : '';
    const kind = contentTypeKind(change.contentType);
    navigate(
      kind === 'singleType'
        ? `/content-manager/single-types/${change.contentType}${search}`
        : `/content-manager/collection-types/${change.contentType}/${change.documentId}${search}`
    );
  };

  const handleMerge = async () => {
    try {
      const summary = await mergeBranch({
        id,
        resolutions: toMergeResolutions(resolutions),
      }).unwrap();
      toggleNotification({
        type: 'success',
        message: formatMessage(
          {
            id: getTranslation('branch.merge.success'),
            defaultMessage:
              '{name} merged into {parent}: {created} created, {updated} updated, {deleted} deleted.',
          },
          {
            name: branch.name,
            parent: parentName,
            created: summary.created,
            updated: summary.updated,
            deleted: summary.deleted,
          }
        ),
      });
      if (currentSlug === branch.slug) {
        switchBranch(parentSlug);
      }
      navigate('..');
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error as Parameters<typeof formatAPIError>[0]),
      });
    }
    setConfirmMerge(false);
  };

  const handleDelete = async () => {
    try {
      await deleteBranch(id).unwrap();
      if (currentSlug === branch.slug) {
        switchBranch(MAIN_SLUG);
      }
      toggleNotification({
        type: 'success',
        message: formatMessage(
          { id: getTranslation('pages.list.deleted'), defaultMessage: 'Branch {name} deleted.' },
          { name: branch.name }
        ),
      });
      navigate('..');
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error as Parameters<typeof formatAPIError>[0]),
      });
    }
    setConfirmDelete(false);
  };

  const handleDiscard = async () => {
    if (!toDiscard) {
      return;
    }
    try {
      await discardChanges({
        id,
        contentType: toDiscard.contentType,
        documentId: toDiscard.documentId,
        locale: toDiscard.locale,
      }).unwrap();
      setResolutions((previous) => {
        const next = { ...previous };
        delete next[docKeyOf(toDiscard)];
        return next;
      });
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error as Parameters<typeof formatAPIError>[0]),
      });
    }
    setToDiscard(null);
  };

  const toggleArchive = async () => {
    try {
      await updateBranch({ id, status: isActive ? 'archived' : 'active' }).unwrap();
      if (isActive && currentSlug === branch.slug) {
        switchBranch(MAIN_SLUG);
      }
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error as Parameters<typeof formatAPIError>[0]),
      });
    }
  };

  const sections: Array<{ kind: ChangeSummary['kind']; title: string }> = [
    {
      kind: 'update',
      title: formatMessage({
        id: getTranslation('branch.section.update'),
        defaultMessage: 'Modified documents',
      }),
    },
    {
      kind: 'create',
      title: formatMessage({
        id: getTranslation('branch.section.create'),
        defaultMessage: 'New documents',
      }),
    },
    {
      kind: 'delete',
      title: formatMessage({
        id: getTranslation('branch.section.delete'),
        defaultMessage: 'Deleted documents',
      }),
    },
  ];

  return (
    <Page.Main>
      <Page.Title>{branch.name}</Page.Title>
      <Layouts.Header
        navigationAction={<BackButton fallback=".." />}
        title={branch.name}
        subtitle={formatMessage(
          {
            id: getTranslation('branch.subtitle'),
            defaultMessage:
              'From {parent} · {count, plural, =0 {no change} one {# change} other {# changes}}',
          },
          { parent: parentName, count: list.length }
        )}
        primaryAction={
          <Flex gap={2}>
            {isActive && currentSlug !== branch.slug ? (
              <Button
                variant="secondary"
                startIcon={<ArrowsCounterClockwise />}
                onClick={() => switchBranch(branch.slug)}
              >
                {formatMessage(
                  { id: getTranslation('pages.list.switchTo'), defaultMessage: 'Switch to {name}' },
                  { name: branch.name }
                )}
              </Button>
            ) : null}
            {isActive ? (
              <Button
                disabled={!canMerge}
                loading={isMerging}
                onClick={() => setConfirmMerge(true)}
              >
                {formatMessage(
                  { id: getTranslation('branch.merge'), defaultMessage: 'Merge into {parent}' },
                  { parent: parentName }
                )}
              </Button>
            ) : null}
          </Flex>
        }
        secondaryAction={
          <Flex gap={2}>
            {branch.status !== 'merged' && allowedActions.canUpdate ? (
              <Button variant="tertiary" onClick={toggleArchive}>
                {isActive
                  ? formatMessage({
                      id: getTranslation('branch.archive'),
                      defaultMessage: 'Archive',
                    })
                  : formatMessage({
                      id: getTranslation('branch.restore'),
                      defaultMessage: 'Restore',
                    })}
              </Button>
            ) : null}
            {allowedActions.canDelete ? (
              <Button
                variant="danger-light"
                startIcon={<Trash />}
                onClick={() => setConfirmDelete(true)}
              >
                {formatMessage({
                  id: getTranslation('branch.delete'),
                  defaultMessage: 'Delete branch',
                })}
              </Button>
            ) : null}
          </Flex>
        }
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={6}>
          {branch.status === 'merged' ? (
            <Alert variant="success" title="" closeLabel="Close" onClose={() => undefined}>
              {formatMessage(
                {
                  id: getTranslation('branch.merged.banner'),
                  defaultMessage: 'This branch was merged on {date}.',
                },
                { date: branch.mergedAt ? new Date(branch.mergedAt).toLocaleString() : '' }
              )}
            </Alert>
          ) : null}

          {isActive && counts.conflicts > 0 ? (
            <Alert
              variant={unresolved > 0 ? 'warning' : 'success'}
              title=""
              closeLabel="Close"
              onClose={() => undefined}
            >
              <Flex gap={4} alignItems="center" wrap="wrap">
                <Typography>
                  {formatMessage(
                    {
                      id: getTranslation('branch.merge.blocked'),
                      defaultMessage:
                        '{count, plural, one {# conflict} other {# conflicts}} must be resolved before merging.',
                    },
                    { count: unresolved }
                  )}
                </Typography>
                <Button size="S" variant="secondary" onClick={() => resolveAll('branch')}>
                  {formatMessage({
                    id: getTranslation('branch.takeAll.branch'),
                    defaultMessage: 'Take all from branch',
                  })}
                </Button>
                <Button size="S" variant="secondary" onClick={() => resolveAll('parent')}>
                  {formatMessage(
                    {
                      id: getTranslation('branch.takeAll.parent'),
                      defaultMessage: 'Take all from {parent}',
                    },
                    { parent: parentName }
                  )}
                </Button>
              </Flex>
            </Alert>
          ) : null}

          {list.length === 0 ? (
            <EmptyStateLayout
              content={formatMessage({
                id: getTranslation('branch.empty'),
                defaultMessage:
                  'Nothing changed on this branch yet. Switch to it in the Content Manager and start editing.',
              })}
              action={
                isActive && currentSlug !== branch.slug ? (
                  <Button variant="secondary" onClick={() => switchBranch(branch.slug)}>
                    {formatMessage(
                      {
                        id: getTranslation('pages.list.switchTo'),
                        defaultMessage: 'Switch to {name}',
                      },
                      { name: branch.name }
                    )}
                  </Button>
                ) : null
              }
            />
          ) : (
            sections
              .filter((section) => list.some((change) => change.kind === section.kind))
              .map((section) => {
                const rows = list.filter((change) => change.kind === section.kind);
                return (
                  <Box
                    key={section.kind}
                    background="neutral0"
                    hasRadius
                    shadow="filterShadow"
                    padding={4}
                  >
                    <Box paddingBottom={3}>
                      <Typography variant="delta" tag="h2">
                        {section.title}
                      </Typography>
                    </Box>
                    <Table colCount={5} rowCount={rows.length + 1}>
                      <Thead>
                        <Tr>
                          <Th>
                            <Typography variant="sigma">Document</Typography>
                          </Th>
                          <Th>
                            <Typography variant="sigma">Content type</Typography>
                          </Th>
                          <Th>
                            <Typography variant="sigma">Details</Typography>
                          </Th>
                          <Th>
                            <Typography variant="sigma">Updated</Typography>
                          </Th>
                          <Th>
                            <Typography variant="sigma" />
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {rows.map((change) => {
                          const key = docKeyOf(change);
                          const pending = change.conflicts.filter(
                            (attribute) => !resolutions[key]?.[attribute]
                          ).length;
                          return (
                            <Tr
                              key={key}
                              onClick={
                                change.kind === 'update' ? () => setOpenDiff(change) : undefined
                              }
                              style={change.kind === 'update' ? { cursor: 'pointer' } : undefined}
                            >
                              <Td>
                                <Flex direction="column" alignItems="flex-start" gap={1}>
                                  <Typography fontWeight="semiBold">
                                    {change.title ??
                                      formatMessage({
                                        id: getTranslation('branch.change.untitled'),
                                        defaultMessage: 'Untitled',
                                      })}
                                  </Typography>
                                  <Typography variant="pi" textColor="neutral600">
                                    {change.documentId}
                                    {change.locale ? ` · ${change.locale}` : ''}
                                  </Typography>
                                </Flex>
                              </Td>
                              <Td>
                                <Typography>{contentTypeLabel(change.contentType)}</Typography>
                              </Td>
                              <Td>
                                {change.kind === 'update' ? (
                                  <Flex gap={2} alignItems="center" wrap="wrap">
                                    <Badge>
                                      {formatMessage(
                                        {
                                          id: getTranslation('branch.change.attributes'),
                                          defaultMessage:
                                            '{count, plural, one {# attribute} other {# attributes}}',
                                        },
                                        { count: change.attributes.length }
                                      )}
                                    </Badge>
                                    {change.conflicts.length > 0 ? (
                                      <Status variant={pending > 0 ? 'danger' : 'success'} size="S">
                                        <Typography tag="span" variant="omega" fontWeight="bold">
                                          {formatMessage(
                                            {
                                              id: getTranslation('branch.change.conflicts'),
                                              defaultMessage:
                                                '{count, plural, one {# conflict} other {# conflicts}}',
                                            },
                                            {
                                              count:
                                                pending > 0 ? pending : change.conflicts.length,
                                            }
                                          )}
                                          {pending === 0 ? ' ✓' : ''}
                                        </Typography>
                                      </Status>
                                    ) : null}
                                  </Flex>
                                ) : (
                                  <Typography textColor="neutral600">—</Typography>
                                )}
                              </Td>
                              <Td>
                                {change.updatedAt ? (
                                  <Typography textColor="neutral800">
                                    <RelativeTime timestamp={new Date(change.updatedAt)} />
                                  </Typography>
                                ) : null}
                              </Td>
                              <Td onClick={(event: React.MouseEvent) => event.stopPropagation()}>
                                <Flex gap={1} justifyContent="flex-end">
                                  {change.kind !== 'delete' && isActive ? (
                                    <IconButton
                                      variant="ghost"
                                      label={formatMessage({
                                        id: getTranslation('branch.change.open'),
                                        defaultMessage: 'Open',
                                      })}
                                      onClick={() => openDocument(change)}
                                    >
                                      <Eye />
                                    </IconButton>
                                  ) : null}
                                  {isActive && allowedActions.canUpdate ? (
                                    <IconButton
                                      variant="ghost"
                                      label={formatMessage({
                                        id: getTranslation('branch.change.discard'),
                                        defaultMessage: 'Discard',
                                      })}
                                      onClick={() => setToDiscard(change)}
                                    >
                                      <Cross />
                                    </IconButton>
                                  ) : null}
                                </Flex>
                              </Td>
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  </Box>
                );
              })
          )}
        </Flex>

        {openDiff ? (
          <DocumentDiffModal
            branchId={id}
            parentName={parentName}
            contentType={openDiff.contentType}
            documentId={openDiff.documentId}
            locale={openDiff.locale}
            resolutions={resolutions[docKeyOf(openDiff)] ?? {}}
            onResolve={(attribute, choice) =>
              setResolutions((previous) => ({
                ...previous,
                [docKeyOf(openDiff)]: {
                  ...(previous[docKeyOf(openDiff)] ?? {}),
                  [attribute]: choice,
                },
              }))
            }
            onClose={() => setOpenDiff(null)}
          />
        ) : null}

        <Dialog.Root open={confirmMerge} onOpenChange={setConfirmMerge}>
          <ConfirmDialog
            onConfirm={handleMerge}
            title={formatMessage(
              {
                id: getTranslation('branch.merge.confirm.title'),
                defaultMessage: 'Merge {name} into {parent}?',
              },
              { name: branch.name, parent: parentName }
            )}
          >
            {formatMessage(
              {
                id: getTranslation('branch.merge.confirm.body'),
                defaultMessage:
                  '{created, plural, =0 {} one {# new document, } other {# new documents, }}{updated, plural, =0 {} one {# updated document, } other {# updated documents, }}{deleted, plural, =0 {} one {# deleted document} other {# deleted documents}} will be applied to {parent}. The branch is then marked as merged.',
              },
              {
                created: counts.create,
                updated: counts.update,
                deleted: counts.delete,
                parent: parentName,
              }
            )}
          </ConfirmDialog>
        </Dialog.Root>

        <Dialog.Root open={confirmDelete} onOpenChange={setConfirmDelete}>
          <ConfirmDialog onConfirm={handleDelete}>
            {formatMessage(
              {
                id: getTranslation('pages.list.delete.confirm'),
                defaultMessage:
                  'Delete {name}? Every document created on it and every change made on it will be lost.',
              },
              { name: branch.name }
            )}
          </ConfirmDialog>
        </Dialog.Root>

        <Dialog.Root
          open={toDiscard !== null}
          onOpenChange={(open) => (!open ? setToDiscard(null) : undefined)}
        >
          <ConfirmDialog onConfirm={handleDiscard}>
            {formatMessage({
              id: getTranslation('branch.change.discard.confirm'),
              defaultMessage: 'Discard the changes made to this document on the branch?',
            })}
          </ConfirmDialog>
        </Dialog.Root>
      </Layouts.Content>
    </Page.Main>
  );
};

const ProtectedBranchPage = () => (
  <Page.Protect permissions={PERMISSIONS.read}>
    <BranchPage />
  </Page.Protect>
);

export { BranchPage, ProtectedBranchPage };
