import * as React from 'react';

import { Table, useTable, useQueryParams } from '@strapi/admin/strapi-admin';
import { Box, Typography, IconButton, Flex, Icon, Tooltip } from '@strapi/design-system';
import { Pencil, CheckCircle, CrossCircle, Rotate } from '@strapi/icons';
import { DocumentStatus } from '@strapi/plugin-content-manager/strapi-admin';
import { Modules } from '@strapi/types';
import { stringify } from 'qs';
import { type MessageDescriptor, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

type status = Modules.Documents.Params.PublicationStatus.Kind | 'modified';

type Row = {
  locale: string;
  status: status;
};

/* -------------------------------------------------------------------------------------------------
 * EntryValidationText
 * -----------------------------------------------------------------------------------------------*/

const TypographyMaxWidth = styled(Typography)`
  max-width: 300px;
`;

interface EntryValidationTextProps {
  status: status;
  validationErrors?: Record<string, MessageDescriptor>;
}

const EntryValidationText = ({ status = 'draft', validationErrors }: EntryValidationTextProps) => {
  const { formatMessage } = useIntl();

  if (validationErrors) {
    const validationErrorsMessages = Object.entries(validationErrors)
      .map(([key, value]) =>
        formatMessage(
          { id: `${value.id}.withField`, defaultMessage: value.defaultMessage },
          { field: key }
        )
      )
      .join(' ');

    return (
      <Flex gap={2}>
        <Icon color="danger600" as={CrossCircle} />
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
        <Icon color="success600" as={CheckCircle} />
        <Typography textColor="success600" fontWeight="bold">
          {formatMessage({
            // id: 'content-manager.bulk-publish.already-published',
            id: 'TODO translation',
            defaultMessage: 'Already Published',
          })}
        </Typography>
      </Flex>
    );
  }

  if (status === 'modified') {
    return (
      <Flex gap={2}>
        <Icon color="alternative600" as={Rotate} />
        <Typography>
          {formatMessage({
            // id: 'app.utils.ready-to-publish',
            id: 'TODO translation',
            defaultMessage: 'Ready to publish changes',
          })}
        </Typography>
      </Flex>
    );
  }

  return (
    <Flex gap={2}>
      <Icon color="success600" as={CheckCircle} />
      <Typography>
        {formatMessage({
          // id: 'app.utils.ready-to-publish',
          id: 'TODO translation',
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
  rows: Row[];
  headers: {
    label: string;
    name: string;
  }[];
  validationErrors?: Record<string, MessageDescriptor>;
}

const BulkLocaleActionModal = ({
  headers,
  rows,
  validationErrors = {},
}: BulkLocaleActionModalProps) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();

  const [{ query }] = useQueryParams();

  // @ts-expect-error TODO: fix this
  const currentLocale = query?.plugins?.i18n?.locale as string;

  const selectedRows: Row[] = useTable(
    'BulkLocaleActionModal',
    (state: { selectedRows: Row[] }) => state.selectedRows
  );

  // Do we need this?
  // const selectedLocales = selectedRows.map(({ locale }) => locale);

  // const localesToPublish = rows
  //   .filter(({ locale }) => selectedLocales.includes(locale) && !validationErrors[locale])
  //   .map(({ locale }) => locale);

  const getFormattedCountMessage = () => {
    const alreadyPublishedCount = selectedRows.filter(
      ({ status }) => status === 'published'
    ).length;
    const readyToPublishCount = selectedRows.filter(
      ({ status }) => status === 'draft' || status === 'modified'
    ).length;
    // if (publishedCount) {
    //   return formatMessage(
    //     {
    //       id: getTranslation('containers.ListPage.selectedEntriesModal.publishedCount'),
    //       defaultMessage:
    //         '<b>{publishedCount}</b> {publishedCount, plural, =0 {entries} one {entry} other {entries}} published. <b>{withErrorsCount}</b> {withErrorsCount, plural, =0 {entries} one {entry} other {entries}} waiting for action.',
    //     },
    //     {
    //       publishedCount,
    //       withErrorsCount: selectedEntriesWithErrorsCount,
    //       b: BoldChunk,
    //     }
    //   );
    // }

    return formatMessage(
      {
        id: 'TODO translation id',
        defaultMessage:
          '<b>{alreadyPublishedCount}</b> {alreadyPublishedCount, plural, =0 {entries} one {entry} other {entries}} already published. <b>{readyToPublishCount}</b> {readyToPublishCount, plural, =0 {entries} one {entry} other {entries}} ready to publish. <b>{withErrorsCount}</b> {withErrorsCount, plural, =0 {entries} one {entry} other {entries}} waiting for action.',
      },
      {
        withErrorsCount: 0,
        // withErrorsCount: selectedEntriesWithErrorsCount,
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
            {rows.map(({ locale, status }, index) => (
              <Table.Row key={index}>
                <Table.CheckboxCell id={locale} aria-label={`Select ${locale}`} />
                <Table.Cell>
                  <Typography variant="sigma" textColor="neutral600">
                    {/* TODO get locale name */}
                    {locale}
                  </Typography>
                </Table.Cell>
                <Table.Cell>
                  {/* TODO fix styling */}
                  <DocumentStatus status={status} />
                </Table.Cell>
                <Table.Cell>
                  {/* TODO condition for loader */}
                  {/* {isPublishing && entriesToPublish.includes(row.id) ? ( */}
                  {false ? null : (
                    // <Flex gap={2}>
                    //   <Typography>
                    //     {formatMessage({
                    //       id: 'content-manager.success.record.publishing',
                    //       defaultMessage: 'Publishing...',
                    //     })}
                    //   </Typography>
                    //   <Loader small />
                    // </Flex>
                    <EntryValidationText
                      // TODO validation errors
                      // validationErrors={validationErrors[row.id]}
                      validationErrors={undefined}
                      status={status}
                    />
                  )}
                </Table.Cell>
                {locale !== currentLocale && (
                  <Table.Cell>
                    <IconButton
                      onClick={() => {
                        navigateToLocale(locale);
                      }}
                      label={formatMessage(
                        {
                          id: 'TODO translation id',
                          defaultMessage: 'Edit {locale}',
                        },
                        {
                          locale,
                        }
                      )}
                      icon={<Pencil />}
                      borderWidth={0}
                    />
                  </Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Box>
    </React.Fragment>
  );
};

export { BulkLocaleActionModal };
export type { BulkLocaleActionModalProps };
