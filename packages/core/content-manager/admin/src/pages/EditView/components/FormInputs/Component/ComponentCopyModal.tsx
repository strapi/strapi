import * as React from 'react';

import { useAPIErrorHandler, useForm, useNotification } from '@strapi/admin/strapi-admin';
import {
  Button,
  EmptyStateLayout,
  Flex,
  Loader,
  Modal,
  Searchbar,
  TextButton,
  Typography,
} from '@strapi/design-system';
import { ArrowLeft, Duplicate } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
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
import { type AnyData } from '../../../utils/data';

import {
  cloneComponentData,
  connectRelations,
  getComponentInstances,
  getCopyScope,
  getRelationsToCopy,
  type ComponentCopyMode,
  type ComponentInstance,
} from './utils/componentCopy';

import type { Document } from '../../../../../hooks/useDocument';

interface ComponentCopyModalProps {
  componentUid: string;
  mode: ComponentCopyMode;
  onClose: () => void;
  onInsert: (componentData: AnyData) => void;
  open: boolean;
  sourceFieldName: string;
}

interface RecentComponentCopy {
  documentId: string;
  entryTitle: string;
  instanceLabel: string;
  savedAt: string;
  sourcePath: string;
}

const RECENT_COMPONENT_COPY_STORAGE_PREFIX = 'STRAPI_COMPONENT_COPY_RECENT';

const getRecentComponentCopyStorageKey = ({
  componentUid,
  mode,
  model,
  scope,
}: {
  componentUid: string;
  mode: ComponentCopyMode;
  model: string;
  scope: string;
}) =>
  [RECENT_COMPONENT_COPY_STORAGE_PREFIX, model, scope, componentUid, mode]
    .map(encodeURIComponent)
    .join(':');

const removeRecentComponentCopy = (key: string) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures; the shortcut can simply disappear from state.
  }
};

const readRecentComponentCopy = (key: string): RecentComponentCopy | null => {
  try {
    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<RecentComponentCopy>;

    if (
      !parsedValue.documentId ||
      !parsedValue.entryTitle ||
      typeof parsedValue.sourcePath !== 'string'
    ) {
      removeRecentComponentCopy(key);
      return null;
    }

    return {
      documentId: parsedValue.documentId,
      entryTitle: parsedValue.entryTitle,
      instanceLabel: parsedValue.instanceLabel ?? parsedValue.entryTitle,
      savedAt: parsedValue.savedAt ?? new Date().toISOString(),
      sourcePath: parsedValue.sourcePath,
    };
  } catch {
    removeRecentComponentCopy(key);
    return null;
  }
};

const writeRecentComponentCopy = (key: string, recentCopy: RecentComponentCopy) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(recentCopy));
  } catch {
    // Ignore storage failures; copying still succeeds without the shortcut.
  }
};

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

const ComponentCopyModal = ({
  componentUid,
  mode,
  onClose,
  onInsert,
  open,
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

  const [search, setSearch] = React.useState('');
  const [selectedDocument, setSelectedDocument] = React.useState<Document | null>(null);
  const [recentComponentCopy, setRecentComponentCopy] = React.useState<RecentComponentCopy | null>(
    null
  );
  const [isCopying, setIsCopying] = React.useState(false);
  const debouncedSearch = useDebounce(search, 300);

  /**
   * Copying a component loads its relations first, the modal can be closed in the meantime.
   */
  const isOpenRef = React.useRef(open);

  React.useEffect(() => {
    isOpenRef.current = open;

    return () => {
      isOpenRef.current = false;
    };
  }, [open]);

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

  const componentDisplayName = currentDocument.components[componentUid]?.info?.displayName;
  const recentComponentCopyStorageKey = React.useMemo(
    () =>
      getRecentComponentCopyStorageKey({
        componentUid,
        mode,
        model: currentDocumentMeta.model,
        scope: getCopyScope(sourceFieldName, targetValues),
      }),
    [componentUid, currentDocumentMeta.model, mode, sourceFieldName, targetValues]
  );

  React.useEffect(() => {
    if (!open || currentDocumentMeta.collectionType !== COLLECTION_TYPES) {
      return;
    }

    getDocuments({
      model: currentDocumentMeta.model,
      params: {
        ...currentDocumentMeta.params,
        _q: debouncedSearch || undefined,
        page: '1',
        pageSize: '10',
        sort: 'updatedAt:DESC',
      },
    });
  }, [
    currentDocumentMeta.collectionType,
    currentDocumentMeta.model,
    currentDocumentMeta.params,
    debouncedSearch,
    getDocuments,
    open,
  ]);

  React.useEffect(() => {
    if (documentsError) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(documentsError),
      });
    }
  }, [documentsError, formatAPIError, toggleNotification]);

  React.useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedDocument(null);
      setIsCopying(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (open) {
      setRecentComponentCopy(readRecentComponentCopy(recentComponentCopyStorageKey));
    }
  }, [open, recentComponentCopyStorageKey]);

  const documents = documentsData?.results ?? [];

  const findInstances = React.useCallback(
    (sourceDocument: Document) =>
      getComponentInstances({
        componentUid,
        components: currentDocument.components,
        getMainField: (uid) => componentLayouts[uid]?.settings?.mainField,
        mode,
        schema: currentDocument.schema,
        sourceDocument,
        sourceFieldName,
        targetValues,
      }),
    [
      componentLayouts,
      componentUid,
      currentDocument.components,
      currentDocument.schema,
      mode,
      sourceFieldName,
      targetValues,
    ]
  );

  const instances = React.useMemo(
    () => (selectedDocument ? findInstances(selectedDocument) : []),
    [findInstances, selectedDocument]
  );

  const untitled = formatMessage({
    id: 'content-manager.containers.untitled',
    defaultMessage: 'Untitled',
  });

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const fetchSourceDocument = React.useCallback(
    async (documentId: string) => {
      try {
        const response = await getDocument({
          collectionType: currentDocumentMeta.collectionType,
          documentId,
          model: currentDocumentMeta.model,
          params: currentDocumentMeta.params,
        }).unwrap();

        return response.data;
      } catch (error) {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(error as Parameters<typeof formatAPIError>[0]),
        });

        return null;
      }
    },
    [
      currentDocumentMeta.collectionType,
      currentDocumentMeta.model,
      currentDocumentMeta.params,
      formatAPIError,
      getDocument,
      toggleNotification,
    ]
  );

  const handleSelectDocument = async (document: Document) => {
    const sourceDocument = await fetchSourceDocument(document.documentId);

    if (sourceDocument) {
      setSelectedDocument(sourceDocument);
    }
  };

  /**
   * The copy is a snapshot of the component, its relations are connected to the same entries.
   * A relation that can't be loaded is left empty rather than failing the whole copy.
   */
  const copyInstance = async (instance: ComponentInstance) => {
    const { components } = currentDocument;
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

  const insertInstance = async (
    instance: ComponentInstance,
    source: Pick<RecentComponentCopy, 'documentId' | 'entryTitle'>
  ) => {
    setIsCopying(true);

    const { data, hasMissingRelations } = await copyInstance(instance);

    if (!isOpenRef.current) {
      return;
    }

    writeRecentComponentCopy(recentComponentCopyStorageKey, {
      ...source,
      instanceLabel: instance.label,
      savedAt: new Date().toISOString(),
      sourcePath: instance.sourcePath,
    });

    onInsert(data);
    onClose();
    toggleNotification(
      hasMissingRelations
        ? {
            type: 'warning',
            message: formatMessage({
              id: getTranslation('components.ComponentCopyModal.relations-warning'),
              defaultMessage: 'Component copied, but some of its relations could not be loaded.',
            }),
          }
        : {
            type: 'success',
            message: formatMessage({
              id: getTranslation('components.ComponentCopyModal.success'),
              defaultMessage: 'Component copied',
            }),
          }
    );
  };

  const handleRecentInsert = async () => {
    if (!recentComponentCopy) {
      return;
    }

    const sourceDocument = await fetchSourceDocument(recentComponentCopy.documentId);

    if (!sourceDocument) {
      return;
    }

    const recentInstance = findInstances(sourceDocument).find(
      (instance) => instance.sourcePath === recentComponentCopy.sourcePath
    );

    if (!recentInstance) {
      removeRecentComponentCopy(recentComponentCopyStorageKey);
      setRecentComponentCopy(null);
      toggleNotification({
        type: 'info',
        message: formatMessage({
          id: getTranslation('components.ComponentCopyModal.recent.unavailable'),
          defaultMessage: 'The recently copied component is no longer available.',
        }),
      });

      return;
    }

    await insertInstance(recentInstance, {
      documentId: recentComponentCopy.documentId,
      entryTitle: recentComponentCopy.entryTitle,
    });
  };

  return (
    <Modal.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage(
              {
                id: getTranslation('components.ComponentCopyModal.title'),
                defaultMessage: 'Copy {component} from existing entry',
              },
              { component: componentDisplayName ?? componentUid }
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Flex direction="column" alignItems="stretch" gap={4}>
            {selectedDocument ? (
              <>
                {/* Keep the button at its own width: stretched, its focus ring overflows the modal body. */}
                <Flex>
                  <TextButton
                    disabled={isCopying}
                    startIcon={<ArrowLeft />}
                    onClick={() => setSelectedDocument(null)}
                  >
                    {formatMessage({
                      id: 'global.back',
                      defaultMessage: 'Back',
                    })}
                  </TextButton>
                </Flex>
                {isFetchingDocument || isCopying ? (
                  <Flex justifyContent="center" padding={6}>
                    <Loader small>
                      {formatMessage({
                        id: getTranslation('components.ComponentCopyModal.loading'),
                        defaultMessage: 'Loading',
                      })}
                    </Loader>
                  </Flex>
                ) : instances.length > 0 ? (
                  <Flex direction="column" alignItems="stretch" gap={2}>
                    {instances.map((instance) => {
                      const entryTitle = getDocumentTitle(
                        selectedDocument,
                        settings.mainField,
                        selectedDocument.documentId,
                        untitled
                      );

                      return (
                        <InstanceButton
                          key={instance.sourcePath}
                          type="button"
                          onClick={() =>
                            insertInstance(instance, {
                              documentId: selectedDocument.documentId,
                              entryTitle,
                            })
                          }
                        >
                          <Flex justifyContent="space-between" alignItems="center" gap={4}>
                            <Flex direction="column" alignItems="flex-start" gap={1}>
                              <Typography variant="omega" fontWeight="bold" textColor="neutral800">
                                {instance.label}
                              </Typography>
                              <Typography variant="pi" textColor="neutral600">
                                {instance.parentLabel
                                  ? formatMessage(
                                      {
                                        id: getTranslation(
                                          'components.ComponentCopyModal.instanceHint.nested'
                                        ),
                                        defaultMessage: 'From {entry}, in {parent}',
                                      },
                                      { entry: entryTitle, parent: instance.parentLabel }
                                    )
                                  : formatMessage(
                                      {
                                        id: getTranslation(
                                          'components.ComponentCopyModal.instanceHint'
                                        ),
                                        defaultMessage: 'From {entry}',
                                      },
                                      { entry: entryTitle }
                                    )}
                              </Typography>
                            </Flex>
                            <Duplicate />
                          </Flex>
                        </InstanceButton>
                      );
                    })}
                  </Flex>
                ) : (
                  <EmptyStateLayout
                    icon={<EmptyDocuments width="16rem" />}
                    content={formatMessage({
                      id: getTranslation('components.ComponentCopyModal.noComponents'),
                      defaultMessage: 'This entry does not have this component yet.',
                    })}
                  />
                )}
              </>
            ) : (
              <>
                {recentComponentCopy && (
                  <RecentCopyPanel direction="column" alignItems="stretch" gap={2}>
                    <Typography variant="pi" fontWeight="bold" textColor="neutral600">
                      {formatMessage({
                        id: getTranslation('components.ComponentCopyModal.recent.title'),
                        defaultMessage: 'Recently copied',
                      })}
                    </Typography>
                    <RecentCopyButton
                      type="button"
                      disabled={isFetchingDocument || isCopying}
                      onClick={handleRecentInsert}
                    >
                      <Flex justifyContent="space-between" alignItems="center" gap={4}>
                        <Flex direction="column" alignItems="flex-start" gap={1}>
                          <Typography variant="omega" fontWeight="bold" textColor="neutral800">
                            {recentComponentCopy.instanceLabel}
                          </Typography>
                          <Typography variant="pi" textColor="neutral600">
                            {formatMessage(
                              {
                                id: getTranslation(
                                  'components.ComponentCopyModal.recent.instanceHint'
                                ),
                                defaultMessage: 'From {entry}',
                              },
                              {
                                entry: recentComponentCopy.entryTitle,
                              }
                            )}
                          </Typography>
                        </Flex>
                        <Duplicate />
                      </Flex>
                    </RecentCopyButton>
                  </RecentCopyPanel>
                )}
                <Searchbar
                  name="component-copy-search"
                  value={search}
                  onChange={handleSearchChange}
                  onClear={() => setSearch('')}
                  clearLabel={formatMessage({
                    id: 'clearLabel',
                    defaultMessage: 'Clear',
                  })}
                  placeholder={formatMessage({
                    id: 'global.search',
                    defaultMessage: 'Search',
                  })}
                  size="S"
                >
                  {formatMessage({
                    id: getTranslation('components.ComponentCopyModal.searchLabel'),
                    defaultMessage: 'Search entries',
                  })}
                </Searchbar>

                {isFetchingDocuments || isDocumentsQueryUninitialized ? (
                  <Flex justifyContent="center" padding={6}>
                    <Loader small>
                      {formatMessage({
                        id: getTranslation('components.ComponentCopyModal.loading'),
                        defaultMessage: 'Loading',
                      })}
                    </Loader>
                  </Flex>
                ) : documents.length > 0 ? (
                  <Flex direction="column" alignItems="stretch" gap={2}>
                    {documents.map((document) => (
                      <EntryButton
                        key={document.documentId}
                        type="button"
                        onClick={() => handleSelectDocument(document)}
                      >
                        <Flex direction="column" alignItems="flex-start" gap={1}>
                          <Typography variant="omega" fontWeight="bold" textColor="neutral800">
                            {getDocumentTitle(
                              document,
                              settings.mainField,
                              document.documentId,
                              untitled
                            )}
                          </Typography>
                          <Typography variant="pi" textColor="neutral600">
                            {document.documentId}
                          </Typography>
                        </Flex>
                      </EntryButton>
                    ))}
                  </Flex>
                ) : (
                  <EmptyStateLayout
                    icon={<EmptyDocuments width="16rem" />}
                    content={formatMessage({
                      id: getTranslation('components.ComponentCopyModal.noEntries'),
                      defaultMessage: 'No entries found',
                    })}
                  />
                )}
              </>
            )}
          </Flex>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary">
              {formatMessage({
                id: 'app.components.Button.cancel',
                defaultMessage: 'Cancel',
              })}
            </Button>
          </Modal.Close>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

const EntryButton = styled.button`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.neutral0};
  color: ${({ theme }) => theme.colors.neutral800};
  padding: ${({ theme }) => theme.spaces[4]};
  text-align: left;
  cursor: pointer;

  &:focus,
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary200};
    background: ${({ theme }) => theme.colors.primary100};
  }
`;

const RecentCopyPanel = styled(Flex)`
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
  padding-bottom: ${({ theme }) => theme.spaces[4]};
`;

const RecentCopyButton = styled(EntryButton)`
  border-color: ${({ theme }) => theme.colors.primary200};
  background: ${({ theme }) => theme.colors.neutral0};
`;

const InstanceButton = styled(EntryButton)``;

export { ComponentCopyModal };
export type { ComponentCopyModalProps };
