import * as React from 'react';

import { useNotification, useQueryParams, Table } from '@strapi/admin/strapi-admin';
import { Flex, Icon, Status, Typography, Button } from '@strapi/design-system';
import { ExclamationMarkCircle, Layer, Trash } from '@strapi/icons';
import {
  type HeaderActionComponent,
  unstable_useDocument as useDocument,
  unstable_useDocumentActions as useDocumentActions,
  type DocumentActionComponent,
  // useGetDraftRelationCountQuery,
  useGetManyDraftRelationCountQuery,
} from '@strapi/plugin-content-manager/strapi-admin';
import { Modules } from '@strapi/types';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import { useI18n } from '../hooks/useI18n';
import { useGetLocalesQuery } from '../services/locales';
import { getTranslation } from '../utils/getTranslation';
import { capitalize } from '../utils/strings';

import { BulkLocaleActionModal } from './BulkLocaleActionModal';

import type { I18nBaseQuery } from '../types';

/* -------------------------------------------------------------------------------------------------
 * LocalePickerAction
 * -----------------------------------------------------------------------------------------------*/

const LocalePickerAction: HeaderActionComponent = ({
  document,
  meta,
  model,
  collectionType,
  documentId,
}) => {
  const { formatMessage } = useIntl();
  const [{ query }, setQuery] = useQueryParams<I18nBaseQuery>();
  const { hasI18n, canCreate, canRead } = useI18n();
  const { data: locales = [] } = useGetLocalesQuery();
  const { schema } = useDocument({ model, collectionType, documentId });

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
    const currentDesiredLocale = query.plugins?.i18n?.locale;
    const doesLocaleExist = locales.find((loc) => loc.code === currentDesiredLocale);
    const defaultLocale = locales.find((locale) => locale.isDefault);
    if (!doesLocaleExist && defaultLocale?.code) {
      handleSelect(defaultLocale.code);
    }
  }, [handleSelect, hasI18n, locales, query.plugins?.i18n?.locale]);

  if (!hasI18n || !Array.isArray(locales) || locales.length === 0) {
    return null;
  }

  const currentLocale = query.plugins?.i18n?.locale || locales.find((loc) => loc.isDefault)?.code;

  const allCurrentLocales = [
    { status: getDocumentStatus(document, meta), locale: currentLocale },
    ...(meta?.availableLocales ?? []),
  ];

  return {
    label: formatMessage({
      id: getTranslation('Settings.locales.modal.locales.label'),
      defaultMessage: 'Locales',
    }),
    options: locales.map((locale) => {
      const currentLocaleDoc = allCurrentLocales.find((doc) =>
        'locale' in doc ? doc.locale === locale.code : false
      );
      const status = currentLocaleDoc?.status ?? 'draft';

      const permissionsToCheck = currentLocaleDoc ? canCreate : canRead;

      const statusVariant =
        status === 'draft' ? 'primary' : status === 'published' ? 'success' : 'alternative';

      return {
        disabled: !permissionsToCheck.includes(locale.code),
        value: locale.code,
        label: locale.name,
        startIcon: schema?.options?.draftAndPublish ? (
          <Status
            display="flex"
            paddingLeft="6px"
            paddingRight="6px"
            paddingTop="2px"
            paddingBottom="2px"
            showBullet={false}
            size={'S'}
            variant={statusVariant}
          >
            <Typography as="span" variant="pi" fontWeight="bold">
              {capitalize(status)}
            </Typography>
          </Status>
        ) : null,
      };
    }),
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

  if (!hasI18n) {
    return null;
  }

  return {
    disabled:
      (document?.locale && !canDelete.includes(document.locale)) || !document || !document.id,
    position: ['header', 'table-row'],
    label: formatMessage({
      id: getTranslation('actions.delete.label'),
      defaultMessage: 'Delete locale',
    }),
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
          <Icon as={ExclamationMarkCircle} width="24px" height="24px" color="danger600" />
          <Typography as="p" variant="omega" textAlign="center">
            {formatMessage({
              id: getTranslation('actions.delete.dialog.body'),
              defaultMessage: 'Are you sure?',
            })}
          </Typography>
        </Flex>
      ),
      onConfirm: async () => {
        if (!documentId || !document?.locale) {
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

/* -------------------------------------------------------------------------------------------------
 * BulkPublishAction
 * -----------------------------------------------------------------------------------------------*/

type LocaleStatus = {
  locale: string;
  status: Modules.Documents.Params.PublicationStatus.Kind | 'modified';
};

const BulkLocalePublishAction: DocumentActionComponent = ({
  document,
  documentId,
  model,
  collectionType,
}) => {
  const { formatMessage } = useIntl();
  const { hasI18n, canPublish } = useI18n();
  const { publish: publishAction } = useDocumentActions();
  const { meta: documentMeta, schema } = useDocument({
    model,
    collectionType,
    documentId,
    params: {
      locale: document?.locale,
    },
  });

  // TODO
  // const {
  //   data: countDraftRelations = 0,
  //   isLoading,
  //   error,
  // } = useGetManyDraftRelationCountQuery(
  //   {
  //     model,
  //     documentIds: selectedEntries.map((id) => id.toString()),
  //     locale: query?.plugins?.i18n?.locale,
  //   },
  //   {
  //     skip: selectedEntries.length === 0,
  //   }
  // );

  const availableLocales = documentMeta?.availableLocales ?? [];

  const [selectedLocales, setSelectedLocales] = React.useState<string[]>([]);
  const [isConfirmationOpen, setIsConfirmationOpen] = React.useState<boolean>(false);

  if (!schema?.options?.draftAndPublish ?? false) {
    return null;
  }

  if (!hasI18n) {
    return null;
  }

  if (!documentId) {
    return null;
  }

  if (!canPublish) {
    return null;
  }

  // This document action can be enabled given that draft and publish and i18n are
  // enabled and we can publish the current locale.
  // In the modal that follows, the user will be able to see which locales are available for publication.

  const rows: LocaleStatus[] = availableLocales.map((doc) => {
    const { locale, status } = doc;

    return { locale, status };
  });
  rows.unshift({
    locale: document?.locale ?? '',
    status: document?.status ?? 'draft',
  });

  const publish = async () => {
    const res = await publishAction(
      {
        documentId,
        model,
        collectionType,
        params: {
          locale: selectedLocales,
        },
      },
      {
        documentId,
      }
    );
    // Handle the response and set the errors if needed
    // Setting errors returned from the API so we can highlight the locales that
    // need action
  };

  const draftRelationCheck = async () => {
    // TODO: Implement this
    // await

    return true;
  };

  const handleAction = async () => {
    const someLocalesHaveDraftRelations = await draftRelationCheck();

    if (someLocalesHaveDraftRelations) {
      setIsConfirmationOpen(true);
    } else {
      await publish();
    }
  };

  const headers = [
    {
      label: formatMessage({
        id: 'TODO translation key',
        defaultMessage: 'Name',
      }),
      name: 'name',
    },
    {
      label: formatMessage({
        id: 'TODO translation key',
        defaultMessage: 'Status',
      }),
      name: 'stages',
    },
    {
      label: formatMessage({
        id: 'TODO translation key',
        defaultMessage: 'Publication status',
      }),
      name: 'publication-status',
    },
  ];
  const isUnpublish = document?.status === 'published';
  if (isUnpublish) {
    console.error(['I18N bulk unpublish modal not implemented']);
    return null;
  }

  if (isConfirmationOpen) {
    return {
      label: formatMessage({
        id: 'TODO translation key',
        defaultMessage: 'Confirmation',
      }),
      dialog: {
        onCancel: () => {
          setIsConfirmationOpen(false);
        },
        type: 'dialog',
        title: formatMessage({
          id: getTranslation('actions.publish.dialog.title'),
          defaultMessage: 'Confirmation',
        }),
        content: (
          <>
            <Flex direction="column" alignItems="stretch" gap={2}>
              <ExclamationMarkCircle />
              {null}
            </Flex>
          </>
        ),
        footer: () => {
          return (
            <Flex justifyContent="flex-end">
              <Button
                onClick={async () => {
                  await publish();
                  setIsConfirmationOpen(false);
                }}
                variant={'danger'}
              >
                {formatMessage({
                  id: 'app.components.Button.confirm',
                  defaultMessage: 'Confirm',
                })}
              </Button>
            </Flex>
          );
        },
      },
    };
  }

  return {
    label: formatMessage({
      id: 'TODO translation key',
      defaultMessage: 'Publish multiple locales',
    }),
    icon: <Layer />,
    position: ['panel'],
    variant: 'secondary',
    dialog: {
      type: 'modal',
      title: formatMessage({
        id: getTranslation('actions.publish.dialog.title'),
        defaultMessage: 'Publish multiple locales',
      }),
      content: (
        <Table.Root
          onSelectedRowsChange={(selectedRows) => {
            setSelectedLocales(selectedRows.map((row) => row.locale));
          }}
          headers={headers}
          rows={rows.map((row) => ({
            ...row,
            id: row.locale,
          }))}
        >
          <BulkLocaleActionModal headers={headers} rows={rows} />
        </Table.Root>
      ),
      footer: () => {
        return (
          <Flex justifyContent="flex-end">
            <Button
              disabled={selectedLocales.length === 0}
              variant="default"
              onClick={handleAction}
            >
              {formatMessage({
                id: 'TODO translation key',
                defaultMessage: 'Publish',
              })}
            </Button>
          </Flex>
        );
      },
    },
  };
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

export { BulkLocalePublishAction, DeleteLocaleAction, LocalePickerAction };
