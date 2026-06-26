import * as React from 'react';

import { useAPIErrorHandler, useNotification } from '@strapi/admin/strapi-admin';
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
import { getIn } from '../../../../../utils/objects';
import { getTranslation } from '../../../../../utils/translations';
import { type AnyData, transformDocument } from '../../../utils/data';

import type { ComponentsDictionary, Document } from '../../../../../hooks/useDocument';

type ComponentCopyMode = 'component' | 'dynamiczone';

interface ComponentCopyModalProps {
  componentUid: string;
  mode: ComponentCopyMode;
  onClose: () => void;
  onInsert: (componentData: AnyData) => void;
  open: boolean;
  sourceFieldName: string;
}

interface ComponentInstance {
  data: AnyData;
  label: string;
  sourceIndex: number;
}

interface RecentComponentCopy {
  documentId: string;
  entryTitle: string;
  instanceLabel: string;
  savedAt: string;
  sourceIndex: number;
}

const COMPONENT_META_KEYS = ['id', '__temp_key__'];
const RECENT_COMPONENT_COPY_STORAGE_PREFIX = 'STRAPI_COMPONENT_COPY_RECENT';

const getRecentComponentCopyStorageKey = ({
  componentUid,
  mode,
  model,
  sourceFieldName,
}: {
  componentUid: string;
  mode: ComponentCopyMode;
  model: string;
  sourceFieldName: string;
}) =>
  [RECENT_COMPONENT_COPY_STORAGE_PREFIX, model, sourceFieldName, componentUid, mode]
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
      typeof parsedValue.sourceIndex !== 'number'
    ) {
      removeRecentComponentCopy(key);
      return null;
    }

    return {
      documentId: parsedValue.documentId,
      entryTitle: parsedValue.entryTitle,
      instanceLabel: parsedValue.instanceLabel ?? parsedValue.entryTitle,
      savedAt: parsedValue.savedAt ?? new Date().toISOString(),
      sourceIndex: parsedValue.sourceIndex,
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

const cloneComponentData = (
  value: unknown,
  componentUid: string,
  components: ComponentsDictionary
): AnyData => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const schema = components[componentUid];
  const cloned = structuredClone(value) as AnyData;

  const sanitize = (datum: AnyData, uid: string) => {
    const componentSchema = components[uid];

    for (const key of COMPONENT_META_KEYS) {
      delete datum[key];
    }

    if (!componentSchema) {
      return datum;
    }

    Object.entries(componentSchema.attributes).forEach(([attributeName, attribute]) => {
      const currentValue = datum[attributeName];

      if (currentValue == null) {
        return;
      }

      if (attribute.type === 'component') {
        if (attribute.repeatable && Array.isArray(currentValue)) {
          datum[attributeName] = currentValue.map((item) =>
            item && typeof item === 'object' ? sanitize(item as AnyData, attribute.component) : item
          );
        } else if (typeof currentValue === 'object' && !Array.isArray(currentValue)) {
          datum[attributeName] = sanitize(currentValue as AnyData, attribute.component);
        }
      }

      if (attribute.type === 'dynamiczone' && Array.isArray(currentValue)) {
        datum[attributeName] = currentValue.map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return item;
          }

          const dynamicComponent = item as AnyData & { __component?: string };
          const dynamicComponentUid = dynamicComponent.__component;

          if (!dynamicComponentUid) {
            return dynamicComponent;
          }

          return {
            ...sanitize(dynamicComponent, dynamicComponentUid),
            __component: dynamicComponentUid,
          };
        });
      }
    });

    return datum;
  };

  const sanitized = sanitize(cloned, componentUid);

  if (!schema) {
    return sanitized;
  }

  return transformDocument(schema, components)(sanitized);
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

const getInstanceLabel = (
  componentData: AnyData,
  componentUid: string,
  index: number,
  mainField: string | undefined,
  components: ComponentsDictionary,
  fallback: string
) => {
  const fieldValue = mainField ? getIn(componentData, mainField) : undefined;

  if (fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim().length > 0) {
    return String(fieldValue);
  }

  const displayName = components[componentUid]?.info?.displayName ?? componentUid;

  return `${displayName} ${index + 1}` || fallback;
};

const getComponentInstances = ({
  componentUid,
  componentMainField,
  components,
  mode,
  sourceDocument,
  sourceFieldName,
}: {
  componentUid: string;
  componentMainField?: string;
  components: ComponentsDictionary;
  mode: ComponentCopyMode;
  sourceDocument?: Document;
  sourceFieldName: string;
}): ComponentInstance[] => {
  if (!sourceDocument) {
    return [];
  }

  const sourceValue = getIn(sourceDocument, sourceFieldName);

  if (mode === 'dynamiczone') {
    const dynamicComponents = Array.isArray(sourceValue) ? sourceValue : [];

    return dynamicComponents
      .map((componentData, sourceIndex) => ({ componentData, sourceIndex }))
      .filter(({ componentData }) => componentData?.__component === componentUid)
      .map(({ componentData, sourceIndex }, index) => ({
        data: {
          ...cloneComponentData(componentData, componentUid, components),
          __component: componentUid,
        },
        label: getInstanceLabel(
          componentData,
          componentUid,
          index,
          componentMainField,
          components,
          `Component ${index + 1}`
        ),
        sourceIndex,
      }));
  }

  const sourceComponents = Array.isArray(sourceValue)
    ? sourceValue
    : sourceValue
      ? [sourceValue]
      : [];

  return sourceComponents.map((componentData, sourceIndex) => ({
    data: cloneComponentData(componentData, componentUid, components),
    label: getInstanceLabel(
      componentData,
      componentUid,
      sourceIndex,
      componentMainField,
      components,
      `Component ${sourceIndex + 1}`
    ),
    sourceIndex,
  }));
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

  const [search, setSearch] = React.useState('');
  const [selectedDocument, setSelectedDocument] = React.useState<Document | null>(null);
  const [recentComponentCopy, setRecentComponentCopy] = React.useState<RecentComponentCopy | null>(
    null
  );
  const debouncedSearch = useDebounce(search, 300);

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

  const componentDisplayName = currentDocument.components[componentUid]?.info?.displayName;
  const recentComponentCopyStorageKey = React.useMemo(
    () =>
      getRecentComponentCopyStorageKey({
        componentUid,
        mode,
        model: currentDocumentMeta.model,
        sourceFieldName,
      }),
    [componentUid, currentDocumentMeta.model, mode, sourceFieldName]
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
    }
  }, [open]);

  React.useEffect(() => {
    if (open) {
      setRecentComponentCopy(readRecentComponentCopy(recentComponentCopyStorageKey));
    }
  }, [open, recentComponentCopyStorageKey]);

  const documents = documentsData?.results ?? [];
  const instances = React.useMemo(
    () =>
      getComponentInstances({
        componentUid,
        componentMainField: componentLayouts[componentUid]?.settings?.mainField,
        components: currentDocument.components,
        mode,
        sourceDocument: selectedDocument ?? undefined,
        sourceFieldName,
      }),
    [
      componentLayouts,
      componentUid,
      currentDocument.components,
      mode,
      selectedDocument,
      sourceFieldName,
    ]
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

  const handleInsert = (
    componentData: AnyData,
    recentCopy?: Omit<RecentComponentCopy, 'savedAt'>
  ) => {
    if (recentCopy) {
      const nextRecentCopy = {
        ...recentCopy,
        savedAt: new Date().toISOString(),
      };

      writeRecentComponentCopy(recentComponentCopyStorageKey, nextRecentCopy);
      setRecentComponentCopy(nextRecentCopy);
    }

    onInsert(componentData);
    onClose();
    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: getTranslation('components.ComponentCopyModal.success'),
        defaultMessage: 'Component copied',
      }),
    });
  };

  const handleRecentInsert = async () => {
    if (!recentComponentCopy) {
      return;
    }

    const sourceDocument = await fetchSourceDocument(recentComponentCopy.documentId);

    if (!sourceDocument) {
      return;
    }

    const recentInstance = getComponentInstances({
      componentUid,
      componentMainField: componentLayouts[componentUid]?.settings?.mainField,
      components: currentDocument.components,
      mode,
      sourceDocument,
      sourceFieldName,
    }).find((instance) => instance.sourceIndex === recentComponentCopy.sourceIndex);

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

    handleInsert(recentInstance.data);
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
                <TextButton startIcon={<ArrowLeft />} onClick={() => setSelectedDocument(null)}>
                  {formatMessage({
                    id: 'global.back',
                    defaultMessage: 'Back',
                  })}
                </TextButton>
                {isFetchingDocument ? (
                  <Flex justifyContent="center" padding={6}>
                    <Loader small>
                      {formatMessage({
                        id: 'global.loading',
                        defaultMessage: 'Loading',
                      })}
                    </Loader>
                  </Flex>
                ) : instances.length > 0 ? (
                  <Flex direction="column" alignItems="stretch" gap={2}>
                    {instances.map((instance, index) => (
                      <InstanceButton
                        key={`${instance.label}-${index}`}
                        type="button"
                        onClick={() =>
                          handleInsert(instance.data, {
                            documentId: selectedDocument.documentId,
                            entryTitle: getDocumentTitle(
                              selectedDocument,
                              settings.mainField,
                              selectedDocument.documentId,
                              untitled
                            ),
                            instanceLabel: instance.label,
                            sourceIndex: instance.sourceIndex,
                          })
                        }
                      >
                        <Flex justifyContent="space-between" alignItems="center" gap={4}>
                          <Flex direction="column" alignItems="flex-start" gap={1}>
                            <Typography variant="omega" fontWeight="bold" textColor="neutral800">
                              {instance.label}
                            </Typography>
                            <Typography variant="pi" textColor="neutral600">
                              {formatMessage(
                                {
                                  id: getTranslation('components.ComponentCopyModal.instanceHint'),
                                  defaultMessage: 'From {entry}',
                                },
                                {
                                  entry: getDocumentTitle(
                                    selectedDocument,
                                    settings.mainField,
                                    selectedDocument.documentId,
                                    untitled
                                  ),
                                }
                              )}
                            </Typography>
                          </Flex>
                          <Duplicate />
                        </Flex>
                      </InstanceButton>
                    ))}
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
                      disabled={isFetchingDocument}
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
                        id: 'global.loading',
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
