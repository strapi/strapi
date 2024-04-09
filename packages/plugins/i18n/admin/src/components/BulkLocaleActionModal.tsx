import * as React from 'react';

import { Table } from '@strapi/admin/strapi-admin';
import { Grid, GridItem, Typography, IconButton, Flex, Icon } from '@strapi/design-system';
import { Pencil, Check, Refresh } from '@strapi/icons';
import { DocumentStatus } from '@strapi/plugin-content-manager/strapi-admin';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

// TODO find @type
type status = 'published' | 'draft' | 'modified';

type Row = {
  locale: string;
  status: status;
  id: string;
};

interface BulkLocaleActionModalProps {
  rows: Row[];
  headers: {
    label: string;
    name: string;
  }[];
}

type PublicationStatus = 'published' | 'ready' | 'waiting';

const getDocumentStats = (rows: Row[]) => {
  const baseStats = {
    published: { amount: 0, description: ' locales already published.' },
    draft: { amount: 0, description: ' locales ready to publish.' },
    default: { amount: 0, description: ' locales waiting for action.' },
  };

  rows.forEach(({ status }: { status: string }) => {
    if (status === 'published') {
      baseStats.published.amount++;
    } else if (status === 'modified' || status === 'draft') {
      baseStats.draft.amount++;
    } else {
      baseStats.default.amount++;
    }
  });

  return Object.values(baseStats);
};

const BulkLocaleActionModal = ({ headers, rows }: BulkLocaleActionModalProps) => {
  // TODO this doesnt work from non default locale
  const { formatMessage } = useIntl();
  const navigate = useNavigate();

  const stats = getDocumentStats(rows);

  const navigateToLocale = (locale: string) => {
    navigate({
      search: stringify({ plugins: { i18n: { locale } } }),
    });
  };

  return (
    <React.Fragment>
      <Grid paddingBottom={5}>
        {stats.map(({ amount, description }, index) => (
          <GridItem col={3} key={index}>
            <Typography fontWeight={'bold'}>{amount}</Typography>
            <Typography>{description}</Typography>
          </GridItem>
        ))}
      </Grid>
      <Table.Content>
        <Table.Head>
          <Table.HeaderCheckboxCell />
          {headers.map((head) => (
            <Table.HeaderCell key={head.name} {...head} />
          ))}
        </Table.Head>
        <Table.Body>
          {rows.map(({ locale, status, id }, index) => (
            <Table.Row key={index}>
              <Table.CheckboxCell id={id} aria-label={`Select ${locale}`} />
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
                {/* TODO fix styling */}
                <PublicationStatus status={status} />
              </Table.Cell>
              <Table.Cell>
                {/* TODO only display if it doesn't match the current locale (or disable on current locale?)*/}
                <IconButton
                  onClick={() => {
                    navigateToLocale(locale);
                  }}
                  label={formatMessage(
                    {
                      id: 'Settings.review-workflows.list.page.list.column.edit',
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
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Content>
    </React.Fragment>
  );
};

const PublicationStatus = ({ status }: { status: status }) => {
  const { formatMessage } = useIntl();

  const statusToLabel = {
    published: 'Already published',
    draft: 'Ready to publish',
    modified: 'Ready to publish changes',
  };

  const statusToIcon = {
    // TODO get new icons
    published: Check,
    draft: Check,
    modified: Refresh,
  };

  return (
    // TODO fix styling
    <Flex>
      <Icon as={statusToIcon[status]} color="success500" />
      <Typography variant="sigma" textColor="neutral600">
        {formatMessage({
          id: 'TODO.poblicaation-status.status',
          defaultMessage: statusToLabel[status],
        })}
      </Typography>
    </Flex>
  );
};

export { BulkLocaleActionModal };
export type { BulkLocaleActionModalProps };
