import * as React from 'react';

import { FormErrors, Table, useTable } from '@strapi/admin/strapi-admin';
import { Box, Typography, IconButton, Flex, Tooltip, Status, Modal } from '@strapi/design-system';
import { Pencil, CheckCircle, CrossCircle, ArrowsCounterClockwise } from '@strapi/icons';
import { Modules } from '@strapi/types';
import { stringify } from 'qs';
import { type MessageDescriptor, useIntl, PrimitiveType } from 'react-intl';
import { Link } from 'react-router-dom';

import { Locale } from '../../../shared/contracts/locales';
import { getTranslation } from '../utils/getTranslation';
import { capitalize } from '../utils/strings';

import { LocaleStatus } from './CMHeaderActions';

type Status = Modules.Documents.Params.PublicationStatus.Kind | 'modified';

/* -------------------------------------------------------------------------------------------------
 * EntryValidationText
 * -----------------------------------------------------------------------------------------------*/

interface EntryValidationTextProps {
  status: Status;
  validationErrors: FormErrors[string] | null;
}

interface TranslationMessage extends MessageDescriptor {
  values?: Record<string, PrimitiveType>;
}

const isErrorMessageDescriptor = (object?: string | object): object is TranslationMessage => {
  return (
    typeof object === 'object' && object !== null && 'id' in object && 'defaultMessage' in object
  );
};

const EntryValidationText = ({ status = 'draft', validationErrors }: EntryValidationTextProps) => {
  const { formatMessage } = useIntl();

  /**
   * TODO: Should this be extracted an made into a factory to recursively get
   * error messages??
   */
  const getErrorStr = (key: string, value?: FormErrors[string]): string => {
    if (typeof value === 'string') {
      return `${key}: ${value}`;
    } else if (isErrorMessageDescriptor(value)) {
      return `${key}: ${formatMessage(value)}`;
    } else if (Array.isArray(value)) {
      return value.map((v) => getErrorStr(key, v)).join(' ');
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      return Object.entries(value)
        .map(([k, v]) => getErrorStr(k, v))
        .join(' ');
    } else {
      /**
       * unlikely to happen, but we need to return something
       */
      return '';
    }
  };

  if (validationErrors) {
    const validationErrorsMessages = Object.entries(validationErrors)
      .map(([key, value]) => {
        return getErrorStr(key, value);
      })
      .join(' ');

    return (
      <Flex gap={2}>
        <CrossCircle fill="danger600" />
        <Tooltip label={validationErrorsMessages}>
          <Typography
            maxWidth={'30rem'}
            textColor="danger600"
            variant="omega"
            fontWeight="semiBold"
            ellipsis
          >
            {validationErrorsMessages}
          </Typography>
        </Tooltip>
      </Flex>
    );
  }

  if (status === 'published') {
    return (
      <Flex gap={2}>
        <CheckCircle fill="success600" />
        <Typography textColor="success600" fontWeight="bold">
          {formatMessage({
            id: 'content-manager.bulk-publish.already-published',
            defaultMessage: 'Already Published',
          })}
        </Typography>
      </Flex>
    );
  }

  if (status === 'modified') {
    return (
      <Flex gap={2}>
        <ArrowsCounterClockwise fill="alternative600" />
        <Typography>
          {formatMessage({
            id: 'app.utils.ready-to-publish-changes',
            defaultMessage: 'Ready to publish changes',
          })}
        </Typography>
      </Flex>
    );
  }

  return (
    <Flex gap={2}>
      <CheckCircle fill="success600" />
      <Typography>
        {formatMessage({
          id: 'app.utils.ready-to-publish',
          defaultMessage: 'Ready to publish',
        })}
      </Typography>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * BoldChunk
 * -----------------------------------------------------------------------------------------------*/

const BoldChunk = (chunks: React.ReactNode) => <Typography fontWeight="bold">{chunks}</Typography>;

/* -------------------------------------------------------------------------------------------------
 * BulkLocaleActionModal
 * -----------------------------------------------------------------------------------------------*/

interface BulkLocaleActionModalProps {
  rows: LocaleStatus[];
  headers: {
    label: string;
    name: string;
  }[];
  localesMetadata: Locale[];
  validationErrors?: FormErrors;
}

const BulkLocaleActionModal = ({
  headers,
  rows,
  localesMetadata,

  validationErrors = {},
}: BulkLocaleActionModalProps) => {
  const { formatMessage } = useIntl();

  const selectedRows = useTable<LocaleStatus[]>(
    'BulkLocaleActionModal',
    (state) => state.selectedRows
  );

  const getFormattedCountMessage = () => {
    const currentStatusByLocale = rows.reduce<Record<string, string>>((acc, { locale, status }) => {
      acc[locale] = status;
      return acc;
    }, {});
    const localesWithErrors = Object.keys(validationErrors);

    const alreadyPublishedCount = selectedRows.filter(
      ({ locale }) => currentStatusByLocale[locale] === 'published'
    ).length;

    const readyToPublishCount = selectedRows.filter(
      ({ locale }) =>
        (currentStatusByLocale[locale] === 'draft' ||
          currentStatusByLocale[locale] === 'modified') &&
        !localesWithErrors.includes(locale)
    ).length;

    const withErrorsCount = localesWithErrors.length;

    return formatMessage(
      {
        id: 'content-manager.containers.list.selectedEntriesModal.selectedCount',
        defaultMessage:
          '<b>{alreadyPublishedCount}</b> {alreadyPublishedCount, plural, =0 {entries} one {entry} other {entries}} already published. <b>{readyToPublishCount}</b> {readyToPublishCount, plural, =0 {entries} one {entry} other {entries}} ready to publish. <b>{withErrorsCount}</b> {withErrorsCount, plural, =0 {entries} one {entry} other {entries}} waiting for action.',
      },
      {
        withErrorsCount,
        readyToPublishCount,
        alreadyPublishedCount,
        b: BoldChunk,
      }
    );
  };

  return (
    <Modal.Body>
      <Typography>{getFormattedCountMessage()}</Typography>
      <Box marginTop={5}>
        <Table.Content>
          <Table.Head>
            <Table.HeaderCheckboxCell />
            {headers.map((head) => (
              <Table.HeaderCell key={head.name} {...head} />
            ))}
          </Table.Head>
          <Table.Body>
            {rows.map(({ locale, status }, index) => {
              const error = validationErrors?.[locale] ?? null;

              const statusVariant =
                status === 'draft' ? 'primary' : status === 'published' ? 'success' : 'alternative';

              return (
                <Table.Row key={index}>
                  <Table.CheckboxCell id={locale} aria-label={`Select ${locale}`} />
                  <Table.Cell>
                    <Typography variant="sigma" textColor="neutral600">
                      {Array.isArray(localesMetadata)
                        ? localesMetadata.find((localeEntry) => localeEntry.code === locale)?.name
                        : locale}
                    </Typography>
                  </Table.Cell>
                  <Table.Cell>
                    <Box display="flex">
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
                        <Typography tag="span" variant="pi" fontWeight="bold">
                          {capitalize(status)}
                        </Typography>
                      </Status>
                    </Box>
                  </Table.Cell>
                  <Table.Cell>
                    <EntryValidationText validationErrors={error} status={status} />
                  </Table.Cell>
                  <Table.Cell>
                    <IconButton
                      tag={Link}
                      to={{
                        search: stringify({ plugins: { i18n: { locale } } }),
                      }}
                      label={formatMessage(
                        {
                          id: getTranslation('Settings.list.actions.edit'),
                          defaultMessage: 'Edit {name} locale',
                        },
                        {
                          name: locale,
                        }
                      )}
                      borderWidth={0}
                    >
                      <Pencil />
                    </IconButton>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Box>
    </Modal.Body>
  );
};

export { BulkLocaleActionModal };
export type { BulkLocaleActionModalProps };
