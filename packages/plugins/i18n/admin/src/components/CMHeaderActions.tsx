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
import { useAIAvailability } from '@strapi/admin/strapi-admin/ee';
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
  Box,
  Link,
} from '@strapi/design-system';
import { WarningCircle, ListPlus, Trash, Earth, Cross, Plus, Sparkle, Loader } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink, useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { useAILocalizationJobsPolling } from '../hooks/useAILocalizationJobsPolling';
import { useI18n } from '../hooks/useI18n';
import { useGetAILocalizationJobsByDocumentQuery } from '../services/aiLocalizationJobs';
import { useGetLocalesQuery } from '../services/locales';
import { useGetManyDraftRelationCountQuery } from '../services/relations';
import { useGetSettingsQuery } from '../services/settings';
import { cleanData } from '../utils/clean';
import { getTranslation } from '../utils/getTranslation';
import { capitalize } from '../utils/strings';

import { BulkLocaleActionModal } from './BulkLocaleActionModal';

import type { Locale } from '../../../shared/contracts/locales';
import type { I18nBaseQuery } from '../types';
import type { Modules } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * LocalePickerAction
 * -----------------------------------------------------------------------------------------------*/

interface LocaleOptionProps {
  isDraftAndPublishEnabled: boolean;
  locale: Locale;
  status: 'draft' | 'published' | 'modified';
  entryExists: boolean;
  translationStatus?: 'processing' | 'failed' | 'completed' | undefined;
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

const LocaleOptionStartIcon = ({
  entryWithLocaleExists,
  translationStatus,
  index,
}: {
  entryWithLocaleExists: boolean;
  translationStatus?: 'processing' | 'failed' | 'completed' | undefined;
  index?: number;
}) => {
  const isAiAvailable = useAIAvailability();

  if (!entryWithLocaleExists) {
    return <Plus />;
  }

  if (isAiAvailable && index !== 0 && translationStatus === 'failed') {
    return <WarningCircle fill="warning600" />;
  }

  return null;
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
  const { data: jobData } = useGetAILocalizationJobsByDocumentQuery({
    documentId: documentId!,
    model: model!,
    collectionType: collectionType!,
  });
  const { data: settings } = useGetSettingsQuery();
  const isAiAvailable = useAIAvailability();
  const setValues = useForm('LocalePickerAction', (state) => state.setValues);

  const handleSelect = React.useCallback(
    (value: string) => {
      setQuery(
        {
          plugins: {
            ...query.plugins,
            i18n: {
              locale: value,
            },
          },
        },
        'push',
        true
      );
    },
    [query.plugins, setQuery]
  );

  const nonTranslatedFields = React.useMemo(() => {
    if (!schema?.attributes) return [];
    return Object.keys(schema.attributes).filter((field) => {
      const attribute = schema.attributes[field] as Record<string, unknown>;
      return (attribute?.pluginOptions as any)?.i18n?.localized === false;
    });
  }, [schema?.attributes]);

  const sourceLocaleData = React.useMemo(() => {
    if (!Array.isArray(locales) || !meta?.availableLocales) return null;

    const defaultLocale = locales.find((locale: Locale) => locale.isDefault);
    const existingLocales = meta.availableLocales.map((loc) => loc.locale);

    const sourceLocaleCode =
      defaultLocale &&
      existingLocales.includes(defaultLocale.code) &&
      defaultLocale.code !== currentDesiredLocale
        ? defaultLocale.code
        : existingLocales.find((locale) => locale !== currentDesiredLocale);

    if (!sourceLocaleCode) return null;

    // Find the document data from availableLocales (now includes non-translatable fields)
    const sourceLocaleDoc = meta.availableLocales.find((loc) => loc.locale === sourceLocaleCode);

    return sourceLocaleDoc
      ? { locale: sourceLocaleCode, data: sourceLocaleDoc as Record<string, unknown> }
      : null;
  }, [locales, meta?.availableLocales, currentDesiredLocale]);

  /**
   * Prefilling form with non-translatable fields from already existing locale
   */
  React.useEffect(() => {
    // Only run when creating a new locale (no document ID yet) and when we have non-translatable fields
    if (!document?.id && nonTranslatedFields.length > 0 && sourceLocaleData?.data) {
      const dataToSet = nonTranslatedFields.reduce(
        (acc: Record<string, unknown>, field: string) => {
          acc[field] = sourceLocaleData.data[field];
          return acc;
        },
        {}
      );

      if (Object.keys(dataToSet).length > 0) {
        setValues(dataToSet);
      }
    }
  }, [document?.id, nonTranslatedFields, sourceLocaleData?.data, setValues]);

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

  // Use meta.availableLocales instead of document.localizations
  // meta.availableLocales contains all locales for the document, even when creating new locales
  const availableLocales = meta?.availableLocales ?? [];
  const documentLocalizations = document?.localizations ?? [];

  // Prefer meta.availableLocales as it's more reliable, fallback to document.localizations
  const allLocalizations = availableLocales.length > 0 ? availableLocales : documentLocalizations;

  const allCurrentLocales = [
    { status: getDocumentStatus(document, meta), locale: currentLocale?.code },
    ...allLocalizations,
  ];

  if (!hasI18n || !Array.isArray(locales) || locales.length === 0) {
    return null;
  }

  const displayedLocales = locales.filter((locale) => {
    /**
     * If you can read we allow you to see the locale exists
     * otherwise the locale is hidden.
     */
    return canRead.includes(locale.code);
  });

  const localesSortingDefaultFirst = displayedLocales.sort((a, b) =>
    a.isDefault ? -1 : b.isDefault ? 1 : 0
  );

  return {
    label: formatMessage({
      id: getTranslation('Settings.locales.modal.locales.label'),
      defaultMessage: 'Locales',
    }),
    options: localesSortingDefaultFirst.map((locale, index) => {
      const entryWithLocaleExists = allCurrentLocales.some((doc) => doc.locale === locale.code);

      const currentLocaleDoc = allCurrentLocales.find((doc) =>
        'locale' in doc ? doc.locale === locale.code : false
      );

      const permissionsToCheck = currentLocaleDoc ? canRead : canCreate;

      if (isAiAvailable && settings?.data?.aiLocalizations) {
        return {
          _render: () => (
            <React.Fragment key={index}>
              <SingleSelectOption
                disabled={!permissionsToCheck.includes(locale.code)}
                key={locale.code}
                startIcon={
                  <LocaleOptionStartIcon
                    entryWithLocaleExists={entryWithLocaleExists}
                    translationStatus={jobData?.data?.status}
                    index={index}
                  />
                }
                value={locale.code}
              >
                <LocaleOption
                  isDraftAndPublishEnabled={!!schema?.options?.draftAndPublish}
                  locale={locale}
                  status={currentLocaleDoc?.status}
                  entryExists={entryWithLocaleExists}
                />
              </SingleSelectOption>
              {localesSortingDefaultFirst.length > 1 && index === 0 && (
                <Box paddingRight={4} paddingLeft={4} paddingTop={2} paddingBottom={2}>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: getTranslation('CMEditViewLocalePicker.locale.ai-translations'),
                      defaultMessage: 'AI Translations',
                    })}
                  </Typography>
                </Box>
              )}
            </React.Fragment>
          ),
        };
      }

      return {
        disabled: !permissionsToCheck.includes(locale.code),
        value: locale.code,
        label: (
          <LocaleOption
            isDraftAndPublishEnabled={!!schema?.options?.draftAndPublish}
            locale={locale}
            status={currentLocaleDoc?.status}
            entryExists={entryWithLocaleExists}
            translationStatus={jobData?.data?.status}
          />
        ),
        startIcon: <LocaleOptionStartIcon entryWithLocaleExists={entryWithLocaleExists} />,
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
 * AISettingsStatusAction
 * -----------------------------------------------------------------------------------------------*/

const AITranslationStatusIcon = styled(Status)<{ $isAISettingEnabled: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.spaces[1]};
  justify-content: center;
  align-items: center;
  height: 3.2rem;
  width: 3.2rem;

  // Disabled state
  ${({ $isAISettingEnabled, theme }) =>
    !$isAISettingEnabled &&
    `
    background-color: ${theme.colors.neutral150};
  `}

  svg {
    ${({ $isAISettingEnabled, theme }) =>
      !$isAISettingEnabled &&
      `
        fill: ${theme.colors.neutral300};
      `}
  }
`;

const SpinningLoader = styled(Loader)`
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  animation: spin 2s linear infinite;
`;

const AITranslationStatusAction = ({ documentId, model, collectionType }: HeaderActionProps) => {
  const { formatMessage } = useIntl();
  const isAIAvailable = useAIAvailability();
  const { data: settings } = useGetSettingsQuery();
  const isAISettingEnabled = settings?.data?.aiLocalizations;
  const { hasI18n } = useI18n();

  // Poll for AI localizations jobs when AI is enabled and we have a documentId
  const { status } = useAILocalizationJobsPolling({
    documentId,
    model,
    collectionType,
  });
  const statusVariant = (() => {
    if (status === 'failed') {
      return 'warning';
    }

    if (isAISettingEnabled) {
      return 'alternative';
    }

    return 'neutral';
  })();

  // Do not display this action when i18n is not available
  if (!hasI18n) {
    return null;
  }

  // Do not display this action when AI is not available
  if (!isAIAvailable) {
    return null;
  }

  return {
    _status: {
      message: (
        <Flex
          height="100%"
          alignItems="center"
          aria-label={formatMessage({
            id: getTranslation('CMEditViewAITranslation.status-aria-label'),
            defaultMessage: 'AI Translation Status',
          })}
        >
          <AITranslationStatusIcon
            $isAISettingEnabled={Boolean(isAISettingEnabled)}
            variant={statusVariant}
            size="S"
          >
            {status === 'processing' ? <SpinningLoader /> : <Sparkle />}
          </AITranslationStatusIcon>
        </Flex>
      ),
      tooltip: (
        <Flex direction="column" padding={4} alignItems="flex-start" width="25rem">
          <Typography variant="pi" fontWeight="600">
            {formatMessage(
              {
                id: getTranslation('CMEditViewAITranslation.status-title'),
                defaultMessage:
                  '{enabled, select, true {AI translation enabled} false {AI translation disabled} other {AI translation disabled}}',
              },
              { enabled: isAISettingEnabled }
            )}
          </Typography>
          <Typography variant="pi" paddingTop={1} paddingBottom={3}>
            {formatMessage({
              id: getTranslation('CMEditViewAITranslation.status-description'),
              defaultMessage:
                'Our AI translates content in all locales each time you save a modification in the default locale.',
            })}
          </Typography>
          <Link
            fontSize="inherit"
            tag={NavLink}
            to="/settings/internationalization"
            style={{ alignSelf: 'flex-end' }}
          >
            <Typography variant="pi" textAlign="right">
              {formatMessage(
                {
                  id: getTranslation('CMEditViewAITranslation.settings-link'),
                  defaultMessage:
                    '{enabled, select, true {Disable it in settings} false {Enable it in settings} other {Enable it in settings}}',
                },
                { enabled: isAISettingEnabled }
              )}
            </Typography>
          </Link>
        </Flex>
      ),
    },
  };
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
  const { hasI18n } = useI18n();
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

  const isAIAvailable = useAIAvailability();
  const { data: settings } = useGetSettingsQuery();
  const isAISettingEnabled = settings?.data?.aiLocalizations;

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

  if (!hasI18n) {
    return null;
  }

  // Do not display this action when AI is available and AI translations are enabled
  if (isAIAvailable && isAISettingEnabled) {
    return null;
  }

  return {
    type: 'icon',
    icon: <Earth />,
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
  const { delete: deleteAction, isLoading } = useDocumentActions();
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
      loading: isLoading,
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
  document,
  documentId,
  model,
  collectionType,
  action,
  meta,
}: ExtendedDocumentActionProps) => {
  const locale = document?.locale ?? null;
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

  const { schema, validate } = useDocument(
    {
      model,
      collectionType,
      documentId,
      params: {
        locale,
      },
    },
    {
      // No need to fetch the document, the data is already available in the `document` prop
      skip: true,
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
    if (!document) {
      return [[], {}];
    }

    const metaLocalizations = (meta?.availableLocales ?? []).map((locale) => ({
      locale: locale.locale,
      status: (locale.status ?? 'draft') as LocaleStatus['status'],
    }));

    const documentLocalizations = (
      (document.localizations ?? []) as Array<{
        locale?: string | null;
        status?: Modules.Documents.Params.PublicationStatus.Kind | 'modified' | null;
      }>
    ).map((doc) => ({
      locale: doc.locale ?? undefined,
      status: (doc.status ?? 'draft') as LocaleStatus['status'],
    }));

    const localesMap = new Map<string, LocaleStatus>();

    metaLocalizations.forEach(({ locale, status }) => {
      if (locale) {
        localesMap.set(locale, { locale, status });
      }
    });

    documentLocalizations.forEach(({ locale, status }) => {
      if (locale) {
        localesMap.set(locale, { locale, status });
      }
    });

    // Build the rows for the bulk locale publish modal by combining the current
    // document with all the available locales from the document meta
    const locales: LocaleStatus[] = [];

    if (document?.locale) {
      locales.push({
        locale: document.locale,
        status: (document.status ?? 'draft') as LocaleStatus['status'],
      });
    }

    locales.push(
      ...Array.from(localesMap.entries())
        .filter(([locale]) => locale !== document?.locale)
        .map(([, value]) => value)
    );

    if (locales.length === 0 && document?.locale) {
      locales.push({
        locale: document.locale,
        status: (document.status ?? 'draft') as LocaleStatus['status'],
      });
    }

    // Build the validation errors for each locale.
    const allDocuments = [document, ...(document.localizations ?? [])];
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

    return [locales, errors];
  }, [document, meta?.availableLocales, validate]);

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
  AITranslationStatusAction,
};
