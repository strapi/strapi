import * as React from 'react';

import { useAPIErrorHandler, useForm, useNotification } from '@strapi/admin/strapi-admin';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Loader,
  Modal,
  Radio,
  Searchbar,
  Typography,
} from '@strapi/design-system';
import { Duplicate, WarningCircle } from '@strapi/icons';
import toPath from 'lodash/toPath';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { COLLECTION_TYPES } from '../../../../../constants/collections';
import { useDebounce } from '../../../../../hooks/useDebounce';
import { useDocumentContext } from '../../../../../hooks/useDocumentContext';
import { useDocumentLayout } from '../../../../../hooks/useDocumentLayout';
import {
  useLazyGetAllDocumentsQuery,
  useLazyGetDocumentQuery,
} from '../../../../../services/documents';
import { useLazyGetAllRelationsQuery } from '../../../../../services/relations';
import { getTranslation } from '../../../../../utils/translations';
import { CellValue } from '../../../../ListView/components/TableCells/CellValue';
import { type AnyData } from '../../../utils/data';

import {
  cloneComponentData,
  connectRelations,
  getComponentInstances,
  getComponentPreview,
  getRelationsToCopy,
  type ComponentCopyMode,
  type ComponentInstance,
  type ComponentPreviewField,
} from './utils/componentCopy';

import type { Document } from '../../../../../hooks/useDocument';

/* -------------------------------------------------------------------------------------------------
 * ComponentCopyModal
 * -----------------------------------------------------------------------------------------------*/

type ComponentCopySelection = 'single' | 'multiple';

interface ComponentCopyModalProps {
  componentUid: string;
  /**
   * The label of the field the copies land in, as it's displayed in the form.
   */
  fieldLabel: string;
  mode: ComponentCopyMode;
  onClose: () => void;
  /**
   * Inserts the copies in the field. Returns `false` when the field turns them down, e.g. because
   * it already holds its maximum number of components. The field then reports it to the user itself.
   */
  onInsert: (components: AnyData[]) => boolean;
  /**
   * Whether the field already holds content the copy is going to replace. Only applies to a
   * `single` selection.
   */
  replacesContent?: boolean;
  /**
   * A field holding one component takes a single copy, a repeatable component or a dynamic zone
   * take several at once.
   */
  selection: ComponentCopySelection;
  sourceFieldName: string;
}

const ENTRIES_PAGE_SIZE = '10';

const getDocumentTitle = (
  document: Document,
  mainField: string,
  fallback: string,
  untitled: string
) => {
  if (mainField !== 'id') {
    const value = document?.[mainField];

    if (value !== undefined && value !== null && String(value).trim().length > 0) {
      return String(value);
    }
  }

  return fallback || untitled;
};

interface EntryRow {
  documentId: string;
  title: string;
  isCurrent: boolean;
  disabled: boolean;
  meta?: string;
}

/**
 * The modal is mounted while it's open and unmounted when it's closed.
 */
const ComponentCopyModal = ({
  componentUid,
  fieldLabel,
  mode,
  onClose,
  onInsert,
  replacesContent = false,
  selection,
  sourceFieldName,
}: ComponentCopyModalProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler(getTranslation);
  const { currentDocument, currentDocumentMeta } = useDocumentContext('ComponentCopyModal');
  const {
    edit: { components: componentLayouts, settings },
  } = useDocumentLayout(currentDocumentMeta.model);
  const targetValues = useForm('ComponentCopyModal', (state) => state.values);
  const isFormModified = useForm('ComponentCopyModal', (state) => state.modified);

  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedDocumentId, setSelectedDocumentId] = React.useState<string | null>(null);
  const [sourceDocument, setSourceDocument] = React.useState<Document | null>(null);
  const [selectedPaths, setSelectedPaths] = React.useState<string[]>([]);
  const [isCopying, setIsCopying] = React.useState(false);

  /**
   * Loading an entry and copying components are asynchronous, the modal can be closed in the
   * meantime and the user can pick another entry while one loads.
   */
  const isMountedRef = React.useRef(true);
  const selectedDocumentIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [
    getDocuments,
    {
      data: documentsData,
      error: documentsError,
      isFetching: isFetchingDocuments,
      isUninitialized: isDocumentsQueryUninitialized,
    },
  ] = useLazyGetAllDocumentsQuery();
  const [getDocument, { isFetching: isFetchingDocument }] = useLazyGetDocumentQuery();
  const [getAllRelations] = useLazyGetAllRelationsQuery();

  const { components } = currentDocument;
  const componentDisplayName = components[componentUid]?.info?.displayName ?? componentUid;
  const currentDocumentId = currentDocumentMeta.documentId;
  /**
   * The last saved version of the entry being edited: what the API holds for it.
   */
  const savedDocument = currentDocument.document;
  /**
   * The list of entries only loads the first level of components: for a field nested in another
   * component, how many components an entry holds is only known once the entry is loaded.
   */
  const isNestedField = toPath(sourceFieldName).length > 1;

  React.useEffect(() => {
    if (currentDocumentMeta.collectionType !== COLLECTION_TYPES) {
      return;
    }

    getDocuments({
      model: currentDocumentMeta.model,
      params: {
        ...currentDocumentMeta.params,
        _q: debouncedSearch || undefined,
        page: '1',
        pageSize: ENTRIES_PAGE_SIZE,
        sort: 'updatedAt:DESC',
      },
    });
  }, [
    currentDocumentMeta.collectionType,
    currentDocumentMeta.model,
    currentDocumentMeta.params,
    debouncedSearch,
    getDocuments,
  ]);

  React.useEffect(() => {
    if (documentsError) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(documentsError),
      });
    }
  }, [documentsError, formatAPIError, toggleNotification]);

  const findInstances = React.useCallback(
    (document: Document) =>
      getComponentInstances({
        componentUid,
        components,
        getMainField: (uid) => componentLayouts[uid]?.settings?.mainField,
        mode,
        schema: currentDocument.schema,
        sourceDocument: document,
        sourceFieldName,
        targetValues,
      }),
    [
      componentLayouts,
      componentUid,
      components,
      currentDocument.schema,
      mode,
      sourceFieldName,
      targetValues,
    ]
  );

  /**
   * In a field holding one component, the saved version of that very component is not something
   * to copy: the field already holds it.
   */
  const filterOwnInstance = React.useCallback(
    (instances: ComponentInstance[]) =>
      selection === 'single'
        ? instances.filter((instance) => instance.sourcePath !== sourceFieldName)
        : instances,
    [selection, sourceFieldName]
  );

  const currentEntryInstances = React.useMemo(
    () => (savedDocument ? filterOwnInstance(findInstances(savedDocument)) : []),
    [filterOwnInstance, findInstances, savedDocument]
  );

  const untitled = formatMessage({
    id: 'content-manager.containers.untitled',
    defaultMessage: 'Untitled',
  });
  const getTitle = (document: Document) =>
    getDocumentTitle(document, settings.mainField, document.documentId, untitled);

  const formatCount = (count: number) =>
    formatMessage(
      {
        id: getTranslation('components.ComponentCopyModal.entries.count'),
        defaultMessage: '{count} {label}',
      },
      { count, label: fieldLabel }
    );
  const noneYet = formatMessage(
    {
      id: getTranslation('components.ComponentCopyModal.entries.none'),
      defaultMessage: 'No {label} yet',
    },
    { label: fieldLabel }
  );

  const currentEntryTitle = savedDocument ? getTitle(savedDocument) : '';
  const normalizedSearch = debouncedSearch.trim().toLowerCase();
  const showCurrentEntry =
    !!savedDocument &&
    !!currentDocumentId &&
    (!normalizedSearch || currentEntryTitle.toLowerCase().includes(normalizedSearch));

  const currentEntryRow: EntryRow | null = showCurrentEntry
    ? {
        documentId: currentDocumentId,
        title: currentEntryTitle,
        isCurrent: true,
        disabled: isFormModified || currentEntryInstances.length === 0,
        meta: isFormModified
          ? formatMessage({
              id: getTranslation('components.ComponentCopyModal.entries.unsaved'),
              defaultMessage: 'Save your changes to copy from this entry',
            })
          : currentEntryInstances.length === 0
            ? selection === 'single'
              ? formatMessage(
                  {
                    id: getTranslation('components.ComponentCopyModal.entries.noneOther'),
                    defaultMessage: 'No other {label} in this entry',
                  },
                  { label: fieldLabel }
                )
              : noneYet
            : formatMessage(
                {
                  id: getTranslation('components.ComponentCopyModal.entries.count.saved'),
                  defaultMessage: '{count} {label} · last saved version',
                },
                { count: currentEntryInstances.length, label: fieldLabel }
              ),
      }
    : null;

  const entryRows: EntryRow[] = [
    ...(currentEntryRow ? [currentEntryRow] : []),
    ...(documentsData?.results ?? [])
      .filter((document) => document.documentId !== currentDocumentId)
      .map((document): EntryRow => {
        const instances = isNestedField ? undefined : findInstances(document);
        const count = instances?.length;

        return {
          documentId: document.documentId,
          title: getTitle(document),
          isCurrent: false,
          disabled: count === 0,
          meta:
            count === undefined
              ? undefined
              : count === 0
                ? noneYet
                : selection === 'single' && count === 1 && instances
                  ? instances[0].label
                  : formatCount(count),
        };
      }),
  ];

  /**
   * Loads the entry components are copied from.
   */
  const handleSelectEntry = async (row: EntryRow) => {
    selectedDocumentIdRef.current = row.documentId;
    setSelectedDocumentId(row.documentId);
    setSelectedPaths([]);

    if (row.isCurrent) {
      setSourceDocument(savedDocument ?? null);

      return;
    }

    setSourceDocument(null);

    try {
      const response = await getDocument({
        collectionType: currentDocumentMeta.collectionType,
        documentId: row.documentId,
        model: currentDocumentMeta.model,
        params: currentDocumentMeta.params,
      }).unwrap();

      // Another entry was picked in the meantime, or the modal was closed.
      if (!isMountedRef.current || selectedDocumentIdRef.current !== row.documentId) {
        return;
      }

      setSourceDocument(response.data);
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      toggleNotification({
        type: 'danger',
        message: formatAPIError(error as Parameters<typeof formatAPIError>[0]),
      });

      if (selectedDocumentIdRef.current === row.documentId) {
        selectedDocumentIdRef.current = null;
        setSelectedDocumentId(null);
      }
    }
  };

  const isCurrentEntrySelected =
    selectedDocumentId !== null && selectedDocumentId === currentDocumentId;
  const instances = React.useMemo(
    () =>
      isCurrentEntrySelected
        ? currentEntryInstances
        : sourceDocument
          ? findInstances(sourceDocument)
          : [],
    [currentEntryInstances, findInstances, isCurrentEntrySelected, sourceDocument]
  );

  // An entry holding a single component is selected right away: there's nothing else to pick.
  React.useEffect(() => {
    if (instances.length === 1) {
      const [{ sourcePath }] = instances;

      setSelectedPaths((paths) =>
        paths.length === 1 && paths[0] === sourcePath ? paths : [sourcePath]
      );
    }
  }, [instances]);

  const selectedInstances = instances.filter((instance) =>
    selectedPaths.includes(instance.sourcePath)
  );
  const areAllSelected = instances.length > 0 && selectedInstances.length === instances.length;

  const togglePath = (sourcePath: string, checked: boolean) => {
    setSelectedPaths((paths) =>
      checked
        ? [...paths.filter((path) => path !== sourcePath), sourcePath]
        : paths.filter((path) => path !== sourcePath)
    );
  };

  const mainField = componentLayouts[componentUid]?.settings?.mainField;
  const previewFields = React.useMemo(
    () =>
      componentLayouts[componentUid]?.layout
        .flat()
        .filter((field) => field.name !== mainField)
        .map((field) => ({ name: field.name, label: field.label })),
    [componentLayouts, componentUid, mainField]
  );

  /**
   * The copy is a snapshot of the component, its relations are connected to the same entries.
   * A relation that can't be loaded is left empty rather than failing the whole copy.
   */
  const copyInstance = async (instance: ComponentInstance) => {
    const relations = getRelationsToCopy(instance.source, componentUid, components);

    const loadedRelations = await Promise.allSettled(
      relations.map(({ model, id, targetField }) =>
        getAllRelations({ model, id, targetField, params: currentDocumentMeta.params }).unwrap()
      )
    );

    const data = loadedRelations.reduce(
      (acc, result, index) =>
        result.status === 'fulfilled'
          ? connectRelations(acc, relations[index].path, result.value)
          : acc,
      cloneComponentData(instance.source, componentUid, components)
    );

    return {
      data: mode === 'dynamiczone' ? { ...data, __component: componentUid } : data,
      hasMissingRelations: loadedRelations.some((result) => result.status === 'rejected'),
    };
  };

  const getSuccessMessage = (count: number) => {
    const entry = isCurrentEntrySelected
      ? formatMessage({
          id: getTranslation('components.ComponentCopyModal.success.currentEntry'),
          defaultMessage: 'this entry',
        })
      : (entryRows.find((row) => row.documentId === selectedDocumentId)?.title ?? '');

    if (selection === 'single') {
      return replacesContent
        ? formatMessage(
            {
              id: getTranslation('components.ComponentCopyModal.success.replaced'),
              defaultMessage: '{label} replaced with content from {entry}',
            },
            { label: fieldLabel, entry }
          )
        : formatMessage(
            {
              id: getTranslation('components.ComponentCopyModal.success.single'),
              defaultMessage: '{label} copied from {entry}',
            },
            { label: fieldLabel, entry }
          );
    }

    if (mode === 'dynamiczone') {
      return formatMessage(
        {
          id: getTranslation('components.ComponentCopyModal.success.components'),
          defaultMessage:
            '{count, plural, one {# {component} component} other {# {component} components}} copied from {entry}',
        },
        { count, component: componentDisplayName, entry }
      );
    }

    return formatMessage(
      {
        id: getTranslation('components.ComponentCopyModal.success.entries'),
        defaultMessage: '{count, plural, one {# entry} other {# entries}} copied from {entry}',
      },
      { count, entry }
    );
  };

  const handleConfirm = async () => {
    if (selectedInstances.length === 0) {
      return;
    }

    setIsCopying(true);

    const copies = await Promise.all(selectedInstances.map(copyInstance));

    if (!isMountedRef.current) {
      return;
    }

    // The field tells the user why it turns the copies down, e.g. it's full.
    if (!onInsert(copies.map(({ data }) => data))) {
      onClose();

      return;
    }

    onClose();
    toggleNotification(
      copies.some(({ hasMissingRelations }) => hasMissingRelations)
        ? {
            type: 'warning',
            message: formatMessage({
              id: getTranslation('components.ComponentCopyModal.relations-warning'),
              defaultMessage: 'Content copied, but some of its relations could not be loaded.',
            }),
          }
        : {
            type: 'success',
            message: getSuccessMessage(copies.length),
          }
    );
  };

  const title =
    selection === 'single'
      ? formatMessage(
          {
            id: getTranslation('components.ComponentCopyModal.title.single'),
            defaultMessage: 'Copy an existing {label}',
          },
          { label: fieldLabel }
        )
      : formatMessage(
          {
            id: getTranslation('components.ComponentCopyModal.title.multiple'),
            defaultMessage: 'Copy existing {label}',
          },
          { label: fieldLabel }
        );

  const confirmLabel =
    selection === 'single' && replacesContent
      ? formatMessage({
          id: getTranslation('components.ComponentCopyModal.confirm.replace'),
          defaultMessage: 'Replace content',
        })
      : selectedInstances.length > 1
        ? formatMessage(
            {
              id: getTranslation('components.ComponentCopyModal.confirm.multiple'),
              defaultMessage: 'Use content from {count} items',
            },
            { count: selectedInstances.length }
          )
        : formatMessage({
            id: getTranslation('components.ComponentCopyModal.confirm'),
            defaultMessage: 'Use content',
          });

  const searchLabel = formatMessage({
    id: getTranslation('components.ComponentCopyModal.search'),
    defaultMessage: 'Search all entries',
  });
  const isLoadingEntries = isFetchingDocuments || isDocumentsQueryUninitialized;
  const isLoadingSource = selectedDocumentId !== null && !isCurrentEntrySelected && !sourceDocument;
  const loadingLabel = formatMessage({
    id: getTranslation('components.ComponentCopyModal.loading'),
    defaultMessage: 'Loading',
  });

  const renderInstanceSummary = (instance: ComponentInstance) => (
    <InstanceSummary
      instance={instance}
      preview={getComponentPreview(instance.source, componentUid, components, previewFields)}
    />
  );

  return (
    <Modal.Root open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <ModalContent>
        <Modal.Header>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Panes>
          <EntriesPane direction="column" alignItems="stretch">
            <Box paddingTop={4} paddingBottom={2} paddingLeft={4} paddingRight={4}>
              <Searchbar
                name="component-copy-search"
                value={search}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setSearch(event.target.value)
                }
                onClear={() => setSearch('')}
                clearLabel={formatMessage({
                  id: 'clearLabel',
                  defaultMessage: 'Clear',
                })}
                placeholder={searchLabel}
                size="S"
              >
                {searchLabel}
              </Searchbar>
            </Box>
            {!normalizedSearch && (
              <Box paddingLeft={4} paddingRight={4} paddingBottom={1}>
                <Typography variant="sigma" textColor="neutral600">
                  {formatMessage({
                    id: getTranslation('components.ComponentCopyModal.entries.title'),
                    defaultMessage: 'Recently updated entries',
                  })}
                </Typography>
              </Box>
            )}
            <Scrollable direction="column" alignItems="stretch" gap={1} padding={2}>
              {isLoadingEntries ? (
                <Flex justifyContent="center" padding={4}>
                  <Loader small>{loadingLabel}</Loader>
                </Flex>
              ) : entryRows.length === 0 ? (
                <Box padding={2}>
                  <Typography variant="omega" textColor="neutral600">
                    {normalizedSearch
                      ? formatMessage(
                          {
                            id: getTranslation('components.ComponentCopyModal.entries.noMatch'),
                            defaultMessage: 'No entry matches “{search}”',
                          },
                          { search: debouncedSearch.trim() }
                        )
                      : formatMessage({
                          id: getTranslation('components.ComponentCopyModal.noEntries'),
                          defaultMessage: 'No entries found',
                        })}
                  </Typography>
                </Box>
              ) : (
                entryRows.map((row) => (
                  <EntryButton
                    key={row.documentId}
                    type="button"
                    aria-pressed={row.documentId === selectedDocumentId}
                    // Picking a second entry while one loads would start a race between the two.
                    disabled={row.disabled || isFetchingDocument || isCopying}
                    onClick={() => handleSelectEntry(row)}
                  >
                    <Flex gap={2} alignItems="center" wrap="wrap">
                      <Typography fontWeight="bold" textColor="inherit">
                        {row.title}
                      </Typography>
                      {row.isCurrent && (
                        <Badge size="S" active>
                          {formatMessage({
                            id: getTranslation('components.ComponentCopyModal.entries.current'),
                            defaultMessage: 'This entry',
                          })}
                        </Badge>
                      )}
                    </Flex>
                    {row.meta && (
                      <Typography variant="pi" textColor="neutral600">
                        {row.meta}
                      </Typography>
                    )}
                  </EntryButton>
                ))
              )}
            </Scrollable>
          </EntriesPane>
          <PreviewPane direction="column" alignItems="stretch">
            {selectedDocumentId === null ? (
              <Flex
                direction="column"
                alignItems="center"
                justifyContent="center"
                gap={2}
                padding={6}
                grow={1}
              >
                <Flex color="neutral400">
                  <Duplicate width="2.4rem" height="2.4rem" />
                </Flex>
                <Typography variant="omega" textColor="neutral600" textAlign="center">
                  {selection === 'single'
                    ? formatMessage(
                        {
                          id: getTranslation('components.ComponentCopyModal.preview.empty.single'),
                          defaultMessage: 'Pick an entry to preview its {label}.',
                        },
                        { label: fieldLabel }
                      )
                    : formatMessage(
                        {
                          id: getTranslation('components.ComponentCopyModal.preview.empty'),
                          defaultMessage: 'Pick an entry to see its {label}.',
                        },
                        { label: fieldLabel }
                      )}
                </Typography>
              </Flex>
            ) : isLoadingSource ? (
              <Flex justifyContent="center" alignItems="center" grow={1} padding={6}>
                <Loader small>{loadingLabel}</Loader>
              </Flex>
            ) : (
              <>
                <PreviewHeader
                  justifyContent="space-between"
                  alignItems="center"
                  gap={4}
                  paddingTop={4}
                  paddingBottom={4}
                  paddingLeft={5}
                  paddingRight={5}
                >
                  <Typography fontWeight="bold" textColor="neutral800" ellipsis>
                    {formatMessage(
                      {
                        id: getTranslation('components.ComponentCopyModal.preview.title'),
                        defaultMessage: '{entry} · {label}',
                      },
                      {
                        entry: entryRows.find((row) => row.documentId === selectedDocumentId)
                          ?.title,
                        label: fieldLabel,
                      }
                    )}
                  </Typography>
                  {selection === 'multiple' && instances.length > 1 && (
                    <Checkbox
                      checked={areAllSelected}
                      onCheckedChange={(checked) =>
                        setSelectedPaths(
                          checked === true ? instances.map((instance) => instance.sourcePath) : []
                        )
                      }
                    >
                      {formatMessage({
                        id: getTranslation('components.ComponentCopyModal.selectAll'),
                        defaultMessage: 'Select all',
                      })}
                    </Checkbox>
                  )}
                </PreviewHeader>
                <Scrollable direction="column" alignItems="stretch" gap={3} padding={5}>
                  {instances.length === 0 ? (
                    <Typography variant="omega" textColor="neutral600">
                      {formatMessage(
                        {
                          id: getTranslation('components.ComponentCopyModal.preview.noComponents'),
                          defaultMessage: 'No {label} in this entry',
                        },
                        { label: fieldLabel }
                      )}
                    </Typography>
                  ) : selection === 'single' && instances.length === 1 ? (
                    <InstanceCard $selected>{renderInstanceSummary(instances[0])}</InstanceCard>
                  ) : selection === 'single' ? (
                    <Radio.Group
                      value={selectedPaths[0] ?? ''}
                      onValueChange={(value: string) => setSelectedPaths([value])}
                    >
                      {instances.map((instance) => (
                        <InstanceCard
                          key={instance.sourcePath}
                          $selected={selectedPaths.includes(instance.sourcePath)}
                        >
                          <Radio.Item value={instance.sourcePath}>
                            {renderInstanceSummary(instance)}
                          </Radio.Item>
                        </InstanceCard>
                      ))}
                    </Radio.Group>
                  ) : (
                    instances.map((instance) => (
                      <SelectableInstanceCard
                        key={instance.sourcePath}
                        checked={selectedPaths.includes(instance.sourcePath)}
                        onCheckedChange={(checked) => togglePath(instance.sourcePath, checked)}
                      >
                        {renderInstanceSummary(instance)}
                      </SelectableInstanceCard>
                    ))
                  )}
                </Scrollable>
              </>
            )}
          </PreviewPane>
        </Panes>
        <ModalFooter gap={4}>
          {selection === 'single' && replacesContent ? (
            <Flex gap={2} alignItems="center" color="warning600">
              <WarningCircle width="1.6rem" height="1.6rem" aria-hidden />
              <Typography variant="pi" textColor="warning600">
                {formatMessage(
                  {
                    id: getTranslation('components.ComponentCopyModal.footer.replace'),
                    defaultMessage: 'This will replace the current content of {label}.',
                  },
                  { label: fieldLabel }
                )}
              </Typography>
            </Flex>
          ) : (
            <Typography variant="pi" textColor="neutral600">
              {formatMessage({
                id: getTranslation('components.ComponentCopyModal.footer.note'),
                defaultMessage:
                  'The content is copied: editing it here won’t change the original entry.',
              })}
            </Typography>
          )}
          <Flex gap={2} shrink={0}>
            <Modal.Close>
              <Button variant="tertiary">
                {formatMessage({
                  id: 'app.components.Button.cancel',
                  defaultMessage: 'Cancel',
                })}
              </Button>
            </Modal.Close>
            <Button
              onClick={handleConfirm}
              disabled={selectedInstances.length === 0}
              loading={isCopying}
            >
              {confirmLabel}
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * InstanceSummary
 * -----------------------------------------------------------------------------------------------*/

interface InstanceSummaryProps {
  instance: ComponentInstance;
  preview: ComponentPreviewField[];
}

const InstanceSummary = ({ instance, preview }: InstanceSummaryProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex tag="span" direction="column" alignItems="stretch" gap={2} grow={1} minWidth={0}>
      <Flex tag="span" gap={2} alignItems="baseline" wrap="wrap">
        <Typography tag="span" fontWeight="bold" textColor="neutral800">
          {instance.label}
        </Typography>
        {instance.parentLabel && (
          <Typography tag="span" variant="pi" textColor="neutral600">
            {formatMessage(
              {
                id: getTranslation('components.ComponentCopyModal.instance.nested'),
                defaultMessage: 'In {parent}',
              },
              { parent: instance.parentLabel }
            )}
          </Typography>
        )}
      </Flex>
      {preview.length > 0 && (
        <PreviewGrid tag="span">
          {preview.map((field) => (
            <Flex tag="span" key={field.name} direction="column" alignItems="stretch" minWidth={0}>
              <Typography tag="span" variant="sigma" textColor="neutral600">
                {field.label}
              </Typography>
              <Typography tag="span" variant="omega" textColor="neutral800" ellipsis>
                <CellValue type={field.type} value={field.value} />
              </Typography>
            </Flex>
          ))}
        </PreviewGrid>
      )}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * SelectableInstanceCard
 * -----------------------------------------------------------------------------------------------*/

interface SelectableInstanceCardProps {
  checked: boolean;
  children: React.ReactNode;
  onCheckedChange: (checked: boolean) => void;
}

/**
 * The whole card toggles its checkbox.
 */
const SelectableInstanceCard = ({
  checked,
  children,
  onCheckedChange,
}: SelectableInstanceCardProps) => {
  const id = React.useId();

  return (
    <InstanceCard tag="label" htmlFor={id} $selected={checked} $interactive>
      <Flex tag="span" gap={3} alignItems="flex-start">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
        />
        {children}
      </Flex>
    </InstanceCard>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Styles
 * -----------------------------------------------------------------------------------------------*/

const ModalContent = styled(Modal.Content)`
  width: 92rem;
  max-width: calc(100% - ${({ theme }) => theme.spaces[8]});
  height: 60rem;
`;

const ModalFooter = styled(Modal.Footer)`
  flex: 0 0 auto;
`;

const Panes = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;

  ${({ theme }) => theme.breakpoints.medium} {
    flex-direction: row;
  }
`;

const EntriesPane = styled(Flex)`
  flex: 0 0 auto;
  max-height: 40%;
  min-height: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};

  ${({ theme }) => theme.breakpoints.medium} {
    width: 30rem;
    max-height: none;
    border-bottom: 0;
    border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
  }
`;

const PreviewPane = styled(Flex)`
  flex: 1;
  min-width: 0;
  min-height: 0;
`;

const Scrollable = styled(Flex)`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;

const PreviewHeader = styled(Flex)`
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const EntryButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spaces[1]};
  width: 100%;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.borderRadius};
  background: transparent;
  color: ${({ theme }) => theme.colors.neutral800};
  padding: ${({ theme }) => theme.spaces[2]} ${({ theme }) => theme.spaces[3]};
  text-align: left;
  cursor: pointer;

  &:not(:disabled):hover {
    background: ${({ theme }) => theme.colors.neutral100};
  }

  &:not(:disabled):focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: -2px;
  }

  &[aria-pressed='true'] {
    border-color: ${({ theme }) => theme.colors.primary200};
    background: ${({ theme }) => theme.colors.primary100};
  }

  &:disabled {
    cursor: not-allowed;
    color: ${({ theme }) => theme.colors.neutral500};
  }
`;

const InstanceCard = styled(Box)<{ $selected?: boolean; $interactive?: boolean }>`
  display: block;
  border: 1px solid
    ${({ theme, $selected }) => ($selected ? theme.colors.primary600 : theme.colors.neutral200)};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.primary100 : theme.colors.neutral100};
  padding: ${({ theme }) => theme.spaces[4]};
  cursor: ${({ $interactive }) => ($interactive ? 'pointer' : 'default')};

  @media (prefers-reduced-motion: no-preference) {
    transition:
      border-color 120ms ${({ theme }) => theme.motion.easings.easeOutQuad},
      background-color 120ms ${({ theme }) => theme.motion.easings.easeOutQuad};
  }

  &:hover {
    border-color: ${({ theme, $interactive, $selected }) =>
      $interactive && !$selected ? theme.colors.primary200 : undefined};
  }
`;

const PreviewGrid = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  gap: ${({ theme }) => theme.spaces[2]} ${({ theme }) => theme.spaces[4]};
`;

export { ComponentCopyModal };
export type { ComponentCopyModalProps, ComponentCopySelection };
