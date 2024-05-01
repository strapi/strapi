import * as React from 'react';

import { Table, useTable } from '@strapi/admin/strapi-admin';
import { Box, Typography, IconButton, Flex, Tooltip } from '@strapi/design-system';
import { Pencil, CheckCircle, CrossCircle, ArrowsCounterClockwise } from '@strapi/icons';
import { DocumentStatus } from '@strapi/plugin-content-manager/strapi-admin';
import { Modules } from '@strapi/types';
import { stringify } from 'qs';
import { type MessageDescriptor, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import { Locale } from '../../../shared/contracts/locales';
import { getTranslation } from '../utils/getTranslation';

import { LocaleStatus } from './CMHeaderActions';

type Status = Modules.Documents.Params.PublicationStatus.Kind | 'modified';

/* -------------------------------------------------------------------------------------------------
 * EntryValidationText
 * -----------------------------------------------------------------------------------------------*/

const TypographyMaxWidth = styled(Typography)`
  max-width: 300px;
`;

interface EntryValidationTextProps {
  status: Status;
  validationErrors?: Record<string, MessageDescriptor>;
}

const EntryValidationText = ({ status = 'draft', validationErrors }: EntryValidationTextProps) => {
  const { formatMessage } = useIntl();

  if (validationErrors) {
    const validationErrorsMessages = Object.entries(validationErrors)
      .map(([key, value]) => `${key}: ${formatMessage(value)}`)
      .join(' ');

    return (
      <Flex gap={2}>
        <CrossCircle fill="danger600" />
        <Tooltip description={validationErrorsMessages}>
          <TypographyMaxWidth textColor="danger600" variant="omega" fontWeight="semiBold" ellipsis>
            {validationErrorsMessages}
          </TypographyMaxWidth>
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
  onClose: () => void;
  localesMetadata: Locale[];
  validationErrors?: Record<
    Modules.Documents.Params.Locale.StringNotation,
    Record<string, MessageDescriptor>
  >;
}

const BulkLocaleActionModal = ({
  headers,
  rows,
  localesMetadata,
  onClose,
  validationErrors = {},
}: BulkLocaleActionModalProps) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();

  const selectedRows: LocaleStatus[] = useTable<LocaleStatus[]>(
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

  const navigateToLocale = (locale: string) => {
    navigate({
      search: stringify({ plugins: { i18n: { locale } } }),
    });
    onClose();
  };

  return (
    <React.Fragment>
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
                      <DocumentStatus status={status} />
                    </Box>
                  </Table.Cell>
                  <Table.Cell>
                    <EntryValidationText validationErrors={error} status={status} />
                  </Table.Cell>
                  <Table.Cell>
                    <IconButton
                      onClick={() => {
                        navigateToLocale(locale);
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
                      icon={<Pencil />}
                      borderWidth={0}
                    />
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Box>
    </React.Fragment>
  );
};

export { BulkLocaleActionModal };
export type { BulkLocaleActionModalProps };
