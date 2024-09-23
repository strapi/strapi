import * as React from 'react';

import { skipToken } from '@reduxjs/toolkit/query';
import {
  useNotification,
  useQueryParams,
  Table,
  useAPIErrorHandler,
  FormErrors,
  useForm,
} from '@strapi/admin/strapi-admin';
import {
  type DocumentActionComponent,
  type DocumentActionProps,
  unstable_useDocument as useDocument,
  unstable_useDocumentActions as useDocumentActions,
  buildValidParams,
  HeaderActionProps,
} from '@strapi/content-manager/strapi-admin';
import {
  Flex,
  Status,
  Typography,
  Button,
  Modal,
  Field,
  SingleSelect,
  SingleSelectOption,
  Dialog,
  type StatusVariant,
} from '@strapi/design-system';
import { WarningCircle, ListPlus, Trash, Download, Cross, Plus } from '@strapi/icons';
import { Modules } from '@strapi/types';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { useI18n } from '../hooks/useI18n';
import { useGetLocalesQuery } from '../services/locales';
import { useGetManyDraftRelationCountQuery } from '../services/relations';
import { cleanData } from '../utils/clean';
import { getTranslation } from '../utils/getTranslation';
import { capitalize } from '../utils/strings';

import { BulkLocaleActionModal } from './BulkLocaleActionModal';

import type { Locale } from '../../../shared/contracts/locales';
import type { I18nBaseQuery } from '../types';

/* -------------------------------------------------------------------------------------------------
 * LocalePickerAction
 * -----------------------------------------------------------------------------------------------*/

interface LocaleOptionProps {
  isDraftAndPublishEnabled: boolean;
  locale: Locale;
  status: 'draft' | 'published' | 'modified';
  entryExists: boolean;
}

const statusVariants: Record<LocaleOptionProps['status'], StatusVariant> = {
  draft: 'secondary',
  published: 'success',
  modified: 'alternative',
};

const LocaleOption = ({
  isDraftAndPublishEnabled,
  locale,
  status,
  entryExists,
}: LocaleOptionProps) => {
  const { formatMessage } = useIntl();

  if (!entryExists) {
    return formatMessage(
      {
        id: getTranslation('CMEditViewLocalePicker.locale.create'),
        defaultMessage: 'Create <bold>{locale}</bold> locale',
      },
      {
        bold: (locale: React.ReactNode) => <b>{locale}</b>,
        locale: locale.name,
      }
    );
  }

  return (
    <Flex width="100%" gap={1} justifyContent="space-between">
      <Typography>{locale.name}</Typography>
      {isDraftAndPublishEnabled ? (
        <Status
          display="flex"
          paddingLeft="6px"
          paddingRight="6px"
          paddingTop="2px"
          paddingBottom="2px"
          showBullet={false}
          size="S"
          variant={statusVariants[status]}
        >
          <Typography tag="span" variant="pi" fontWeight="bold">
            {capitalize(status)}
          </Typography>
        </Status>
      ) : null}
    </Flex>
  );
};

const LocalePickerAction = ({
  document,
  meta,
  model,
  collectionType,
  documentId,
}: HeaderActionProps) => {
  const { formatMessage } = useIntl();
  const [{ query }, setQuery] = useQueryParams<I18nBaseQuery>();
  const { hasI18n, canCreate, canRead } = useI18n();
  const { data: locales = [] } = useGetLocalesQuery();
  const currentDesiredLocale = query.plugins?.i18n?.locale;
  const { schema } = useDocument({
    model,
    collectionType,
    documentId,
    params: { locale: currentDesiredLocale },
  });

  const handleSelect = React.useCallback(
    (value: string) => {
      setQuery({
        plugins: {
          ...query.plugins,
          i18n: {
            locale: value,
          },
        },
      });
    },
    [query.plugins, setQuery]
  );

  React.useEffect(() => {
    if (!Array.isArray(locales) || !hasI18n) {
      return;
    }
    /**
     * Handle the case where the current locale query param doesn't exist
     * in the list of available locales, so we redirect to the default locale.
     */
    const doesLocaleExist = locales.find((loc) => loc.code === currentDesiredLocale);
    const defaultLocale = locales.find((locale) => locale.isDefault);
    if (!doesLocaleExist && defaultLocale?.code) {
      handleSelect(defaultLocale.code);
    }
  }, [handleSelect, hasI18n, locales, currentDesiredLocale]);

  const currentLocale = Array.isArray(locales)
    ? locales.find((locale) => locale.code === currentDesiredLocale)
    : undefined;

  const allCurrentLocales = [
    { status: getDocumentStatus(document, meta), locale: currentLocale?.code },
    ...(meta?.availableLocales ?? []),
  ];

  if (!hasI18n || !Array.isArray(locales) || locales.length === 0) {
    return null;
  }

  return {
    label: formatMessage({
      id: getTranslation('Settings.locales.modal.locales.label'),
      defaultMessage: 'Locales',
    }),
    options: locales.map((locale) => {
      const entryWithLocaleExists = allCurrentLocales.some((doc) => doc.locale === locale.code);

      const currentLocaleDoc = allCurrentLocales.find((doc) =>
        'locale' in doc ? doc.locale === locale.code : false
      );

      const permissionsToCheck = currentLocaleDoc ? canRead : canCreate;

      return {
        disabled: !permissionsToCheck.includes(locale.code),
        value: locale.code,
        label: (
          <LocaleOption
            isDraftAndPublishEnabled={!!schema?.options?.draftAndPublish}
            locale={locale}
            status={currentLocaleDoc?.status}
            entryExists={entryWithLocaleExists}
          />
        ),
        startIcon: !entryWithLocaleExists ? <Plus /> : null,
      };
    }),
    customizeContent: () => currentLocale?.name,
    onSelect: handleSelect,
    value: currentLocale,
  };
};

type UseDocument = typeof useDocument;

const getDocumentStatus = (
  document: ReturnType<UseDocument>['document'],
  meta: ReturnType<UseDocument>['meta']
): 'draft' | 'published' | 'modified' => {
  const docStatus = document?.status;
  const statuses = meta?.availableStatus ?? [];

  /**
   * Creating an entry
   */
  if (!docStatus) {
    return 'draft';
  }

  /**
   * We're viewing a draft, but the document could have a published version
   */
  if (docStatus === 'draft' && statuses.find((doc) => doc.publishedAt !== null)) {
    return 'published';
  }

  return docStatus;
};

/* -------------------------------------------------------------------------------------------------
 * FillFromAnotherLocaleAction
 * -----------------------------------------------------------------------------------------------*/

const FillFromAnotherLocaleAction = ({
  documentId,
  meta,
  model,
  collectionType,
}: HeaderActionProps) => {
  const { formatMessage } = useIntl();
  const [{ query }] = useQueryParams<I18nBaseQuery>();
  const currentDesiredLocale = query.plugins?.i18n?.locale;
  const [localeSelected, setLocaleSelected] = React.useState<string | null>(null);
  const setValues = useForm('FillFromAnotherLocale', (state) => state.setValues);

  const { getDocument } = useDocumentActions();
  const { schema, components } = useDocument({
    model,
    documentId,
    collectionType,
    params: { locale: currentDesiredLocale },
  });
  const { data: locales = [] } = useGetLocalesQuery();

  const availableLocales = Array.isArray(locales)
    ? locales.filter((locale) => meta?.availableLocales.some((l) => l.locale === locale.code))
    : [];

  const fillFromLocale = (onClose: () => void) => async () => {
    const response = await getDocument({
      collectionType,
      model,
      documentId,
      params: { locale: localeSelected },
    });
    if (!response || !schema) {
      return;
    }

    const { data } = response;

    const cleanedData = cleanData(data, schema, components);

    setValues(cleanedData);

    onClose();
  };

  return {
    type: 'icon',
    icon: <Download />,
    disabled: availableLocales.length === 0,
    label: formatMessage({
      id: getTranslation('CMEditViewCopyLocale.copy-text'),
      defaultMessage: 'Fill in from another locale',
    }),
    dialog: {
      type: 'dialog',
      title: formatMessage({
        id: getTranslation('CMEditViewCopyLocale.dialog.title'),
        defaultMessage: 'Confirmation',
      }),
      content: ({ onClose }: { onClose: () => void }) => (
        <>
          <Dialog.Body>
            <Flex direction="column" gap={3}>
              <WarningCircle width="24px" height="24px" fill="danger600" />
              <Typography textAlign="center">
                {formatMessage({
                  id: getTranslation('CMEditViewCopyLocale.dialog.body'),
                  defaultMessage:
                    'Your current content will be erased and filled by the content of the selected locale:',
                })}
              </Typography>
              <Field.Root width="100%">
                <Field.Label>
                  {formatMessage({
                    id: getTranslation('CMEditViewCopyLocale.dialog.field.label'),
                    defaultMessage: 'Locale',
                  })}
                </Field.Label>
                <SingleSelect
                  value={localeSelected}
                  placeholder={formatMessage({
                    id: getTranslation('CMEditViewCopyLocale.dialog.field.placeholder'),
                    defaultMessage: 'Select one locale...',
                  })}
                  // @ts-expect-error – the DS will handle numbers, but we're not allowing the API.
                  onChange={(value) => setLocaleSelected(value)}
                >
                  {availableLocales.map((locale) => (
                    <SingleSelectOption key={locale.code} value={locale.code}>
                      {locale.name}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              </Field.Root>
            </Flex>
          </Dialog.Body>
          <Dialog.Footer>
            <Flex gap={2} width="100%">
              <Button flex="auto" variant="tertiary" onClick={onClose}>
                {formatMessage({
                  id: getTranslation('CMEditViewCopyLocale.cancel-text'),
                  defaultMessage: 'No, cancel',
                })}
              </Button>
              <Button flex="auto" variant="success" onClick={fillFromLocale(onClose)}>
                {formatMessage({
                  id: getTranslation('CMEditViewCopyLocale.submit-text'),
                  defaultMessage: 'Yes, fill in',
                })}
              </Button>
            </Flex>
          </Dialog.Footer>
        </>
      ),
    },
  };
};

/* -------------------------------------------------------------------------------------------------
 * DeleteLocaleAction
 * -----------------------------------------------------------------------------------------------*/

const DeleteLocaleAction: DocumentActionComponent = ({
  document,
  documentId,
  model,
  collectionType,
}) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { toggleNotification } = useNotification();
  const { delete: deleteAction } = useDocumentActions();
  const { hasI18n, canDelete } = useI18n();

  // Get the current locale object, using the URL instead of document so it works while creating
  const [{ query }] = useQueryParams<I18nBaseQuery>();
  const { data: locales = [] } = useGetLocalesQuery();
  const currentDesiredLocale = query.plugins?.i18n?.locale;
  const locale = !('error' in locales) && locales.find((loc) => loc.code === currentDesiredLocale);

  if (!hasI18n) {
    return null;
  }

  return {
    disabled:
      (document?.locale && !canDelete.includes(document.locale)) || !document || !document.id,
    position: ['header', 'table-row'],
    label: formatMessage(
      {
        id: getTranslation('actions.delete.label'),
        defaultMessage: 'Delete entry ({locale})',
      },
      { locale: locale && locale.name }
    ),
    icon: <StyledTrash />,
    variant: 'danger',
    dialog: {
      type: 'dialog',
      title: formatMessage({
        id: getTranslation('actions.delete.dialog.title'),
        defaultMessage: 'Confirmation',
      }),
      content: (
        <Flex direction="column" gap={2}>
          <WarningCircle width="24px" height="24px" fill="danger600" />
          <Typography tag="p" variant="omega" textAlign="center">
            {formatMessage({
              id: getTranslation('actions.delete.dialog.body'),
              defaultMessage: 'Are you sure?',
            })}
          </Typography>
        </Flex>
      ),
      onConfirm: async () => {
        const unableToDelete =
          // We are unable to delete a collection type without a document ID
          // & unable to delete generally if there is no document locale
          (collectionType !== 'single-types' && !documentId) || !document?.locale;

        if (unableToDelete) {
          console.error(
            "You're trying to delete a document without an id or locale, this is likely a bug with Strapi. Please open an issue."
          );

          toggleNotification({
            message: formatMessage({
              id: getTranslation('actions.delete.error'),
              defaultMessage: 'An error occurred while trying to delete the document locale.',
            }),
            type: 'danger',
          });

          return;
        }

        const res = await deleteAction({
          documentId,
          model,
          collectionType,
          params: { locale: document.locale },
        });

        if (!('error' in res)) {
          navigate({ pathname: `../${collectionType}/${model}` }, { replace: true });
        }
      },
    },
  };
};

export type LocaleStatus = {
  locale: string;
  status: Modules.Documents.Params.PublicationStatus.Kind | 'modified';
};

interface ExtendedDocumentActionProps extends DocumentActionProps {
  action?: 'bulk-publish' | 'bulk-unpublish';
}

/* -------------------------------------------------------------------------------------------------
 * BulkLocaleAction
 *
 * This component is used to handle bulk publish and unpublish actions on locales.
 * -----------------------------------------------------------------------------------------------*/

const BulkLocaleAction: DocumentActionComponent = ({
  document: baseDocument,
  documentId,
  model,
  collectionType,
  action,
}: ExtendedDocumentActionProps) => {
  const baseLocale = baseDocument?.locale ?? null;

  const [{ query }] = useQueryParams<{ status: 'draft' | 'published' }>();

  const params = React.useMemo(() => buildValidParams(query), [query]);
  const isOnPublishedTab = query.status === 'published';

  const { formatMessage } = useIntl();
  const { hasI18n, canPublish } = useI18n();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const [selectedRows, setSelectedRows] = React.useState<any[]>([]);
  const [isDraftRelationConfirmationOpen, setIsDraftRelationConfirmationOpen] =
    React.useState<boolean>(false);

  const { publishMany: publishManyAction, unpublishMany: unpublishManyAction } =
    useDocumentActions();

  const {
    document,
    meta: documentMeta,
    schema,
    validate,
  } = useDocument(
    {
      model,
      collectionType,
      documentId,
      params: {
        locale: baseLocale,
      },
    },
    {
      skip: !hasI18n || !baseLocale,
    }
  );

  const { data: localesMetadata = [] } = useGetLocalesQuery(hasI18n ? undefined : skipToken);

  const headers = [
    {
      label: formatMessage({
        id: 'global.name',
        defaultMessage: 'Name',
      }),
      name: 'name',
    },
    {
      label: formatMessage({
        id: getTranslation('CMEditViewBulkLocale.status'),
        defaultMessage: 'Status',
      }),
      name: 'status',
    },
    {
      label: formatMessage({
        id: getTranslation('CMEditViewBulkLocale.publication-status'),
        defaultMessage: 'Publication Status',
      }),
      name: 'publication-status',
    },
  ];

  // Extract the rows for the bulk locale publish modal and any validation
  // errors per locale
  const [rows, validationErrors] = React.useMemo(() => {
    if (!document || !documentMeta?.availableLocales) {
      // If we don't have a document or available locales, we return empty rows
      // and no validation errors
      return [[], {}];
    }

    // Build the rows for the bulk locale publish modal by combining the current
    // document with all the available locales from the document meta
    const rowsFromMeta: LocaleStatus[] = documentMeta?.availableLocales.map((doc) => {
      const { locale, status } = doc;

      return { locale, status };
    });

    rowsFromMeta.unshift({
      locale: document.locale,
      status: document.status,
    });

    // Build the validation errors for each locale.
    const allDocuments = [document, ...(documentMeta?.availableLocales ?? [])];
    const errors = allDocuments.reduce<FormErrors>((errs, document) => {
      if (!document) {
        return errs;
      }

      // Validate each locale entry via the useDocument validate function and store any errors in a dictionary
      const validation = validate(document as Modules.Documents.AnyDocument);
      if (validation !== null) {
        errs[document.locale] = validation;
      }
      return errs;
    }, {});

    return [rowsFromMeta, errors];
  }, [document, documentMeta?.availableLocales, validate]);

  const isBulkPublish = action === 'bulk-publish';
  const localesForAction = selectedRows.reduce((acc: string[], selectedRow: LocaleStatus) => {
    const isValidLocale =
      // Validation errors are irrelevant if we are trying to unpublish
      !isBulkPublish || !Object.keys(validationErrors).includes(selectedRow.locale);

    const shouldAddLocale = isBulkPublish
      ? selectedRow.status !== 'published' && isValidLocale
      : selectedRow.status !== 'draft' && isValidLocale;

    if (shouldAddLocale) {
      acc.push(selectedRow.locale);
    }

    return acc;
  }, []);

  // TODO skipping this for now as there is a bug with the draft relation count that will be worked on separately
  // see https://www.notion.so/strapi/Count-draft-relations-56901b492efb45ab90d42fe975b32bd8?pvs=4
  const enableDraftRelationsCount = false;
  const {
    data: draftRelationsCount = 0,
    isLoading: isDraftRelationsLoading,
    error: isDraftRelationsError,
  } = useGetManyDraftRelationCountQuery(
    {
      model,
      documentIds: [documentId!],
      locale: localesForAction,
    },
    {
      skip: !enableDraftRelationsCount || !documentId || localesForAction.length === 0,
    }
  );

  React.useEffect(() => {
    if (isDraftRelationsError) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(isDraftRelationsError),
      });
    }
  }, [isDraftRelationsError, toggleNotification, formatAPIError]);

  if (!schema?.options?.draftAndPublish) {
    return null;
  }

  if (!hasI18n) {
    return null;
  }

  if (!documentId) {
    return null;
  }

  // This document action can be enabled given that draft and publish and i18n are
  // enabled and we can publish the current locale.

  const publish = async () => {
    await publishManyAction({
      model,
      documentIds: [documentId],
      params: {
        ...params,
        locale: localesForAction,
      },
    });

    setSelectedRows([]);
  };

  const unpublish = async () => {
    await unpublishManyAction({
      model,
      documentIds: [documentId],
      params: {
        ...params,
        locale: localesForAction,
      },
    });

    setSelectedRows([]);
  };

  const handleAction = async () => {
    if (draftRelationsCount > 0) {
      setIsDraftRelationConfirmationOpen(true);
    } else if (isBulkPublish) {
      await publish();
    } else {
      await unpublish();
    }
  };

  if (isDraftRelationConfirmationOpen) {
    return {
      label: formatMessage({
        id: 'app.components.ConfirmDialog.title',
        defaultMessage: 'Confirmation',
      }),
      variant: 'danger',
      dialog: {
        onCancel: () => {
          setIsDraftRelationConfirmationOpen(false);
        },
        onConfirm: async () => {
          await publish();

          setIsDraftRelationConfirmationOpen(false);
        },
        type: 'dialog',
        title: formatMessage({
          id: getTranslation('actions.publish.dialog.title'),
          defaultMessage: 'Confirmation',
        }),
        content: (
          <Flex direction="column" alignItems="center" gap={2}>
            <WarningCircle width="2.4rem" height="2.4rem" fill="danger600" />
            <Typography textAlign="center">
              {formatMessage({
                id: getTranslation('CMEditViewBulkLocale.draft-relation-warning'),
                defaultMessage:
                  'Some locales are related to draft entries. Publishing them could leave broken links in your app.',
              })}
            </Typography>
            <Typography textAlign="center">
              {formatMessage({
                id: getTranslation('CMEditViewBulkLocale.continue-confirmation'),
                defaultMessage: 'Are you sure you want to continue?',
              })}
            </Typography>
          </Flex>
        ),
      },
    };
  }

  const hasPermission = selectedRows
    .map(({ locale }) => locale)
    .every((locale) => canPublish.includes(locale));

  return {
    label: formatMessage({
      id: getTranslation(`CMEditViewBulkLocale.${isBulkPublish ? 'publish' : 'unpublish'}-title`),
      defaultMessage: `${isBulkPublish ? 'Publish' : 'Unpublish'} Multiple Locales`,
    }),
    variant: isBulkPublish ? 'secondary' : 'danger',
    icon: isBulkPublish ? <ListPlus /> : <Cross />,
    disabled: isOnPublishedTab || canPublish.length === 0,
    position: ['panel'],
    dialog: {
      type: 'modal',
      title: formatMessage({
        id: getTranslation(`CMEditViewBulkLocale.${isBulkPublish ? 'publish' : 'unpublish'}-title`),
        defaultMessage: `${isBulkPublish ? 'Publish' : 'Unpublish'} Multiple Locales`,
      }),
      content: () => {
        return (
          <Table.Root
            headers={headers}
            rows={rows.map((row) => ({
              ...row,
              id: row.locale,
            }))}
            selectedRows={selectedRows}
            onSelectedRowsChange={(tableSelectedRows) => setSelectedRows(tableSelectedRows)}
          >
            <BulkLocaleActionModal
              validationErrors={validationErrors}
              headers={headers}
              rows={rows}
              localesMetadata={localesMetadata as Locale[]}
              action={action ?? 'bulk-publish'}
            />
          </Table.Root>
        );
      },
      footer: () => (
        <Modal.Footer justifyContent="flex-end">
          <Button
            loading={isDraftRelationsLoading}
            disabled={!hasPermission || localesForAction.length === 0}
            variant="default"
            onClick={handleAction}
          >
            {formatMessage({
              id: isBulkPublish ? 'app.utils.publish' : 'app.utils.unpublish',
              defaultMessage: isBulkPublish ? 'Publish' : 'Unpublish',
            })}
          </Button>
        </Modal.Footer>
      ),
    },
  };
};

/* -------------------------------------------------------------------------------------------------
 * BulkLocalePublishAction
 * -----------------------------------------------------------------------------------------------*/
const BulkLocalePublishAction: DocumentActionComponent = (props: ExtendedDocumentActionProps) => {
  return BulkLocaleAction({ action: 'bulk-publish', ...props });
};

/* -------------------------------------------------------------------------------------------------
 * BulkLocaleUnpublishAction
 * -----------------------------------------------------------------------------------------------*/
const BulkLocaleUnpublishAction: DocumentActionComponent = (props: ExtendedDocumentActionProps) => {
  return BulkLocaleAction({ action: 'bulk-unpublish', ...props });
};

/**
 * Because the icon system is completely broken, we have to do
 * this to remove the fill from the cog.
 */
const StyledTrash = styled(Trash)`
  path {
    fill: currentColor;
  }
`;

export {
  BulkLocalePublishAction,
  BulkLocaleUnpublishAction,
  DeleteLocaleAction,
  LocalePickerAction,
  FillFromAnotherLocaleAction,
};
