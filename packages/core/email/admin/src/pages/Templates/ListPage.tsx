import { Layouts, Page } from '@strapi/admin/strapi-admin';
import {
  Badge,
  Flex,
  LinkButton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { NavLink, useSearchParams } from 'react-router-dom';

import { useTemplates } from '../../services/templates';

export const ListPage = () => {
  const { formatMessage } = useIntl();
  const [searchParams] = useSearchParams();
  const prefix = searchParams.get('prefix') ?? undefined;

  const { data, isLoading, isError } = useTemplates(prefix);

  if (isLoading) {
    return <Page.Loading />;
  }

  if (isError || !data) {
    return <Page.Error />;
  }

  const title = formatMessage({
    id: 'email.Templates.list.title',
    defaultMessage: 'Email templates',
  });

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          { name: title }
        )}
      </Page.Title>
      <Layouts.Header
        title={title}
        subtitle={formatMessage({
          id: 'email.Templates.list.subtitle',
          defaultMessage: 'Edit the emails your project sends, per locale',
        })}
      />
      <Layouts.Content>
        {data.length === 0 ? (
          <Typography textColor="neutral600">
            {formatMessage({
              id: 'email.Templates.list.empty',
              defaultMessage: 'There are no email templates',
            })}
          </Typography>
        ) : (
          <Table colCount={5} rowCount={data.length + 1}>
            <Thead>
              <Tr>
                {[
                  { id: 'email.Templates.list.key', defaultMessage: 'Key' },
                  { id: 'email.Templates.list.description', defaultMessage: 'Description' },
                  { id: 'email.Templates.list.locales', defaultMessage: 'Locales' },
                  { id: 'email.Templates.list.status', defaultMessage: 'Status' },
                ].map((label) => (
                  <Th key={label.id}>
                    <Typography variant="sigma" textColor="neutral600">
                      {formatMessage(label)}
                    </Typography>
                  </Th>
                ))}
                <Th>
                  <VisuallyHidden>
                    {formatMessage({
                      id: 'email.Templates.list.actions',
                      defaultMessage: 'Actions',
                    })}
                  </VisuallyHidden>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.map((template) => (
                <Tr key={template.key}>
                  <Td>
                    <Typography textColor="neutral800" fontWeight="bold">
                      {template.key}
                    </Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">{template.description}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">{template.locales.join(', ')}</Typography>
                  </Td>
                  <Td>
                    {template.customised ? (
                      <Badge>
                        {formatMessage({
                          id: 'email.Templates.list.customised',
                          defaultMessage: 'Customised',
                        })}
                      </Badge>
                    ) : null}
                  </Td>
                  <Td>
                    <Flex justifyContent="flex-end">
                      <LinkButton
                        tag={NavLink}
                        to={encodeURIComponent(template.key)}
                        variant="tertiary"
                      >
                        {formatMessage(
                          { id: 'email.Templates.list.edit', defaultMessage: 'Edit {key}' },
                          { key: template.key }
                        )}
                      </LinkButton>
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Layouts.Content>
    </Page.Main>
  );
};
