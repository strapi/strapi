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
import { type IntlFormatters, useIntl } from 'react-intl';
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
  /**
   * How many components the field can still take. The selection can't exceed it.
   */
  maxSelection?: number;
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
 * The entry picked in the list. Kept apart from the list: searching can filter the entry out of
 * the list while its components are still previewed.
 */
interface SelectedEntry {
  documentId: string;
  title: string;
  isCurrent: boolean;
}

interface GetEntryMetaArgs {
  /**
   * How many components of the wanted kind the entry holds, `undefined` when it isn't known yet.
   */
  count: number | undefined;
  fieldLabel: string;
  /**
   * The label of the only component of the entry, when it holds a single one.
   */
  firstInstanceLabel?: string;
  formatMessage: IntlFormatters['formatMessage'];
  isCurrent: boolean;
  isFormModified: boolean;
  selection: ComponentCopySelection;
}

/**
 * The line of text shown under the title of an entry in the list.
 */
const getEntryMeta = ({
  count,
  fieldLabel,
  firstInstanceLabel,
  formatMessage,
  isCurrent,
  isFormModified,
  selection,
}: GetEntryMetaArgs): string | undefined => {
  if (isCurrent && isFormModified) {
    return formatMessage({
      id: getTranslation('components.ComponentCopyModal.entries.unsaved'),
      defaultMessage: 'Save your changes to copy from this entry',
    });
  }

  if (count === undefined) {
    return undefined;
  }

  if (count === 0) {
    return isCurrent && selection === 'single'
      ? formatMessage(
          {
            id: getTranslation('components.ComponentCopyModal.entries.noneOther'),
            defaultMessage: 'No other {label} in this entry',
          },
          { label: fieldLabel }
        )
      : formatMessage(
          {
            id: getTranslation('components.ComponentCopyModal.entries.none'),
            defaultMessage: 'No {label} yet',
          },
          { label: fieldLabel }
        );
  }

  if (isCurrent) {
    return formatMessage(
      {
        id: getTranslation('components.ComponentCopyModal.entries.count.saved'),
        defaultMessage: '{count, plural, one {# item} other {# items}} · last saved version',
      },
      { count }
    );
  }

  if (selection === 'single' && count === 1 && firstInstanceLabel) {
    return firstInstanceLabel;
  }

  return formatMessage(
    {
      id: getTranslation('components.ComponentCopyModal.entries.count'),
      defaultMessage: '{count, plural, one {# item} other {# items}}',
    },
    { count }
  );
};

/**
 * The modal is mounted while it's open and unmounted when it's closed.
 */
const ComponentCopyModal = ({
  componentUid,
  fieldLabel,
  maxSelection = Infinity,
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
  const [selectedEntry, setSelectedEntry] = React.useState<SelectedEntry | null>(null);
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
        meta: getEntryMeta({
          count: currentEntryInstances.length,
          fieldLabel,
          formatMessage,
          isCurrent: true,
          isFormModified,
          selection,
        }),
      }
    : null;

  const entryRows: EntryRow[] = [
    ...(currentEntryRow ? [currentEntryRow] : []),
    ...(documentsData?.results ?? [])
      .filter((document) => document.documentId !== currentDocumentId)
      .map((document): EntryRow => {
        const instances = isNestedField ? undefined : findInstances(document);

        return {
          documentId: document.documentId,
          title: getTitle(document),
          isCurrent: false,
          disabled: instances?.length === 0,
          meta: getEntryMeta({
            count: instances?.length,
            fieldLabel,
            firstInstanceLabel: instances?.[0]?.label,
            formatMessage,
            isCurrent: false,
            isFormModified,
            selection,
          }),
        };
      }),
  ];

  /**
   * Loads the entry components are copied from.
   */
  const handleSelectEntry = async (row: EntryRow) => {
    selectedDocumentIdRef.current = row.documentId;
    setSelectedEntry({ documentId: row.documentId, title: row.title, isCurrent: row.isCurrent });
    setSelectedPaths([]);

    if (row.isCurrent) {
      setSourceDocument(savedDocument ?? null);

      return;
    }

    setSourceDocument(null);

    const result = await getDocument({
      collectionType: currentDocumentMeta.collectionType,
      documentId: row.documentId,
      model: currentDocumentMeta.model,
      params: currentDocumentMeta.params,
    });

    // Another entry was picked in the meantime, or the modal was closed.
    if (!isMountedRef.current || selectedDocumentIdRef.current !== row.documentId) {
      return;
    }

    if (result.error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(result.error),
      });
      selectedDocumentIdRef.current = null;
      setSelectedEntry(null);

      return;
    }

    setSourceDocument(result.data?.data ?? null);
  };

  const isCurrentEntrySelected = selectedEntry?.isCurrent ?? false;
  const instances = React.useMemo(() => {
    if (isCurrentEntrySelected) {
      return currentEntryInstances;
    }

    return sourceDocument ? findInstances(sourceDocument) : [];
  }, [currentEntryInstances, findInstances, isCurrentEntrySelected, sourceDocument]);

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
  const isSelectionTooLarge = selectedInstances.length > maxSelection;

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

  /**
   * The current entry gets its own messages: "this entry" can't be injected in place of an
   * entry title without breaking the sentence in other languages.
   */
  const getSuccessMessage = (count: number) => {
    const entry = selectedEntry?.title ?? '';

    if (selection === 'single' && replacesContent) {
      return isCurrentEntrySelected
        ? formatMessage(
            {
              id: getTranslation('components.ComponentCopyModal.success.replaced.currentEntry'),
              defaultMessage: '{label} replaced with content from this entry',
            },
            { label: fieldLabel }
          )
        : formatMessage(
            {
              id: getTranslation('components.ComponentCopyModal.success.replaced'),
              defaultMessage: '{label} replaced with content from {entry}',
            },
            { label: fieldLabel, entry }
          );
    }

    if (selection === 'single') {
      return isCurrentEntrySelected
        ? formatMessage(
            {
              id: getTranslation('components.ComponentCopyModal.success.single.currentEntry'),
              defaultMessage: '{label} copied from this entry',
            },
            { label: fieldLabel }
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
      return isCurrentEntrySelected
        ? formatMessage(
            {
              id: getTranslation('components.ComponentCopyModal.success.components.currentEntry'),
              defaultMessage:
                '{count, plural, one {# {component} component} other {# {component} components}} copied from this entry',
            },
            { count, component: componentDisplayName }
          )
        : formatMessage(
            {
              id: getTranslation('components.ComponentCopyModal.success.components'),
              defaultMessage:
                '{count, plural, one {# {component} component} other {# {component} components}} copied from {entry}',
            },
            { count, component: componentDisplayName, entry }
          );
    }

    return isCurrentEntrySelected
      ? formatMessage(
          {
            id: getTranslation('components.ComponentCopyModal.success.entries.currentEntry'),
            defaultMessage:
              '{count, plural, one {# entry} other {# entries}} copied from this entry',
          },
          { count }
        )
      : formatMessage(
          {
            id: getTranslation('components.ComponentCopyModal.success.entries'),
            defaultMessage: '{count, plural, one {# entry} other {# entries}} copied from {entry}',
          },
          { count, entry }
        );
  };

  const handleConfirm = async () => {
    if (selectedInstances.length === 0 || isSelectionTooLarge) {
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

  const getConfirmLabel = () => {
    if (selection === 'single' && replacesContent) {
      return formatMessage({
        id: getTranslation('components.ComponentCopyModal.confirm.replace'),
        defaultMessage: 'Replace content',
      });
    }

    if (selectedInstances.length > 1) {
      return formatMessage(
        {
          id: getTranslation('components.ComponentCopyModal.confirm.multiple'),
          defaultMessage: 'Use content from {count} items',
        },
        { count: selectedInstances.length }
      );
    }

    return formatMessage({
      id: getTranslation('components.ComponentCopyModal.confirm'),
      defaultMessage: 'Use content',
    });
  };

  const renderFooterNote = () => {
    if (isSelectionTooLarge) {
      return (
        <FooterWarning>
          {formatMessage(
            {
              id: getTranslation('components.ComponentCopyModal.footer.tooMany'),
              defaultMessage:
                'You can add {remaining, plural, one {# more item} other {# more items}} to {label}. Unselect {excess, plural, one {# item} other {# items}}.',
            },
            {
              label: fieldLabel,
              remaining: maxSelection,
              excess: selectedInstances.length - maxSelection,
            }
          )}
        </FooterWarning>
      );
    }

    if (selection === 'single' && replacesContent) {
      return (
        <FooterWarning>
          {formatMessage(
            {
              id: getTranslation('components.ComponentCopyModal.footer.replace'),
              defaultMessage: 'This will replace the current content of {label}.',
            },
            { label: fieldLabel }
          )}
        </FooterWarning>
      );
    }

    return (
      <Typography variant="pi" textColor="neutral600">
        {formatMessage({
          id: getTranslation('components.ComponentCopyModal.footer.note'),
          defaultMessage: 'The content is copied: editing it here won’t change the original entry.',
        })}
      </Typography>
    );
  };

  const isLoadingEntries = isFetchingDocuments || isDocumentsQueryUninitialized;
  const isLoadingSource = selectedEntry !== null && !selectedEntry.isCurrent && !sourceDocument;
  const loadingLabel = formatMessage({
    id: getTranslation('components.ComponentCopyModal.loading'),
    defaultMessage: 'Loading',
  });

  const renderInstanceSummary = (instance: ComponentInstance, titleId: string) => (
    <InstanceSummary
      instance={instance}
      preview={getComponentPreview(instance.source, componentUid, components, previewFields)}
      titleId={titleId}
    />
  );

  const renderPreview = () => {
    if (selectedEntry === null) {
      return (
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
      );
    }

    if (isLoadingSource) {
      return (
        <Flex justifyContent="center" alignItems="center" grow={1} padding={6}>
          <Loader small>{loadingLabel}</Loader>
        </Flex>
      );
    }

    return (
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
              { entry: selectedEntry.title, label: fieldLabel }
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
          <InstancePicker
            fieldLabel={fieldLabel}
            instances={instances}
            onSelectedPathsChange={setSelectedPaths}
            renderSummary={renderInstanceSummary}
            selectedPaths={selectedPaths}
            selection={selection}
          />
        </Scrollable>
      </>
    );
  };

  return (
    <Modal.Root open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <ModalContent>
        <Modal.Header>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Panes>
          <EntriesPane
            appliedSearch={debouncedSearch}
            isLoading={isLoadingEntries}
            // Picking a second entry while one loads would start a race between the two.
            isSelectionLocked={isFetchingDocument || isCopying}
            onSearchChange={setSearch}
            onSelect={handleSelectEntry}
            rows={entryRows}
            search={search}
            selectedDocumentId={selectedEntry?.documentId ?? null}
          />
          <PreviewPane direction="column" alignItems="stretch">
            {renderPreview()}
          </PreviewPane>
        </Panes>
        <ModalFooter gap={4}>
          {renderFooterNote()}
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
              disabled={selectedInstances.length === 0 || isSelectionTooLarge}
              loading={isCopying}
            >
              {getConfirmLabel()}
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * EntriesPane
 * -----------------------------------------------------------------------------------------------*/

interface EntriesPaneProps {
  /**
   * The search the list reflects: the typed search, debounced.
   */
  appliedSearch: string;
  isLoading: boolean;
  /**
   * Whether picking an entry is temporarily refused, e.g. while one loads.
   */
  isSelectionLocked: boolean;
  onSearchChange: (search: string) => void;
  onSelect: (row: EntryRow) => void;
  rows: EntryRow[];
  search: string;
  selectedDocumentId: string | null;
}

/**
 * The left pane of the modal: the search and the list of entries to copy from.
 */
const EntriesPane = ({
  appliedSearch,
  isLoading,
  isSelectionLocked,
  onSearchChange,
  onSelect,
  rows,
  search,
  selectedDocumentId,
}: EntriesPaneProps) => {
  const { formatMessage } = useIntl();
  const normalizedSearch = appliedSearch.trim();
  const searchLabel = formatMessage({
    id: getTranslation('components.ComponentCopyModal.search'),
    defaultMessage: 'Search all entries',
  });

  const renderRows = () => {
    if (isLoading) {
      return (
        <Flex justifyContent="center" padding={4}>
          <Loader small>
            {formatMessage({
              id: getTranslation('components.ComponentCopyModal.loading'),
              defaultMessage: 'Loading',
            })}
          </Loader>
        </Flex>
      );
    }

    if (rows.length === 0) {
      return (
        <Box padding={2}>
          <Typography variant="omega" textColor="neutral600">
            {normalizedSearch
              ? formatMessage(
                  {
                    id: getTranslation('components.ComponentCopyModal.entries.noMatch'),
                    defaultMessage: 'No entry matches “{search}”',
                  },
                  { search: normalizedSearch }
                )
              : formatMessage({
                  id: getTranslation('components.ComponentCopyModal.noEntries'),
                  defaultMessage: 'No entries found',
                })}
          </Typography>
        </Box>
      );
    }

    return rows.map((row) => (
      <EntryButton
        key={row.documentId}
        type="button"
        aria-pressed={row.documentId === selectedDocumentId}
        disabled={row.disabled || isSelectionLocked}
        onClick={() => onSelect(row)}
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
    ));
  };

  return (
    <EntriesPaneRoot direction="column" alignItems="stretch">
      <Box paddingTop={4} paddingBottom={2} paddingLeft={4} paddingRight={4}>
        <Searchbar
          name="component-copy-search"
          value={search}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onSearchChange(event.target.value)
          }
          onClear={() => onSearchChange('')}
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
        {renderRows()}
      </Scrollable>
    </EntriesPaneRoot>
  );
};

/* -------------------------------------------------------------------------------------------------
 * InstancePicker
 * -----------------------------------------------------------------------------------------------*/

interface InstancePickerProps {
  fieldLabel: string;
  instances: ComponentInstance[];
  onSelectedPathsChange: (paths: string[]) => void;
  renderSummary: (instance: ComponentInstance, titleId: string) => React.ReactNode;
  selectedPaths: string[];
  selection: ComponentCopySelection;
}

/**
 * The components of the picked entry: a read-only card when there's one to take, radios when one
 * of several is taken, checkboxes when several can be taken.
 */
const InstancePicker = ({
  fieldLabel,
  instances,
  onSelectedPathsChange,
  renderSummary,
  selectedPaths,
  selection,
}: InstancePickerProps) => {
  const { formatMessage } = useIntl();
  const radioTitleId = React.useId();

  if (instances.length === 0) {
    return (
      <Typography variant="omega" textColor="neutral600">
        {formatMessage(
          {
            id: getTranslation('components.ComponentCopyModal.preview.noComponents'),
            defaultMessage: 'No {label} in this entry',
          },
          { label: fieldLabel }
        )}
      </Typography>
    );
  }

  if (selection === 'single' && instances.length === 1) {
    return (
      <InstanceCard $selected>{renderSummary(instances[0], `${radioTitleId}-0`)}</InstanceCard>
    );
  }

  if (selection === 'single') {
    return (
      <Radio.Group
        value={selectedPaths[0] ?? ''}
        onValueChange={(value: string) => onSelectedPathsChange([value])}
      >
        {instances.map((instance, index) => {
          const titleId = `${radioTitleId}-${index}`;

          return (
            <InstanceCard
              key={instance.sourcePath}
              $selected={selectedPaths.includes(instance.sourcePath)}
            >
              <Radio.Item value={instance.sourcePath} aria-labelledby={titleId}>
                {renderSummary(instance, titleId)}
              </Radio.Item>
            </InstanceCard>
          );
        })}
      </Radio.Group>
    );
  }

  const togglePath = (sourcePath: string, checked: boolean) => {
    onSelectedPathsChange(
      checked
        ? [...selectedPaths.filter((path) => path !== sourcePath), sourcePath]
        : selectedPaths.filter((path) => path !== sourcePath)
    );
  };

  return (
    <>
      {instances.map((instance) => (
        <SelectableInstanceCard
          key={instance.sourcePath}
          checked={selectedPaths.includes(instance.sourcePath)}
          onCheckedChange={(checked) => togglePath(instance.sourcePath, checked)}
          renderSummary={(titleId) => renderSummary(instance, titleId)}
        />
      ))}
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * InstanceSummary
 * -----------------------------------------------------------------------------------------------*/

interface InstanceSummaryProps {
  instance: ComponentInstance;
  preview: ComponentPreviewField[];
  /**
   * The id given to the title, for the control picking the component to be named after it.
   */
  titleId: string;
}

const InstanceSummary = ({ instance, preview, titleId }: InstanceSummaryProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex tag="span" direction="column" alignItems="stretch" gap={2} grow={1} minWidth={0}>
      <Flex tag="span" gap={2} alignItems="baseline" wrap="wrap">
        <Typography tag="span" id={titleId} fontWeight="bold" textColor="neutral800">
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
  onCheckedChange: (checked: boolean) => void;
  renderSummary: (titleId: string) => React.ReactNode;
}

/**
 * The whole card toggles its checkbox. The checkbox is named after the title of the component
 * only, not after the whole preview.
 */
const SelectableInstanceCard = ({
  checked,
  onCheckedChange,
  renderSummary,
}: SelectableInstanceCardProps) => {
  const id = React.useId();
  const titleId = `${id}-title`;

  return (
    <InstanceCard tag="label" htmlFor={id} $selected={checked} $interactive>
      <Flex tag="span" gap={3} alignItems="flex-start">
        <Checkbox
          id={id}
          aria-labelledby={titleId}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
        />
        {renderSummary(titleId)}
      </Flex>
    </InstanceCard>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Styles
 * -----------------------------------------------------------------------------------------------*/

const FooterWarning = ({ children }: { children: React.ReactNode }) => (
  <Flex gap={2} alignItems="center" color="warning600">
    <WarningCircle width="1.6rem" height="1.6rem" aria-hidden />
    <Typography variant="pi" textColor="warning600">
      {children}
    </Typography>
  </Flex>
);

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

const EntriesPaneRoot = styled(Flex)`
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

export { ComponentCopyModal, getEntryMeta };
export type { ComponentCopyModalProps, ComponentCopySelection };
