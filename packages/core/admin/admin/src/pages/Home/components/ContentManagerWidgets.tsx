import * as React from 'react';

import { DocumentStatus } from '@strapi/content-manager/strapi-admin';
import { Box, IconButton, Table, Tbody, Td, Tr, Typography } from '@strapi/design-system';
import { Pencil } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { RelativeTime } from '../../../components/RelativeTime';
import { useGetRecentDocumentsQuery } from '../../../services/homepage';

import { Widget } from './Widget';

import type { RecentDocument } from '../../../../../shared/contracts/homepage';

const getEditViewLink = (document: RecentDocument): string => {
  // TODO: import the constants for this once the code is moved to the CM package
  const kindPath = document.kind === 'singleType' ? 'single-types' : 'collection-types';

  return `/content-manager/${kindPath}/${document.model}/${document.documentId}`;
};

const LastEditedWidget = () => {
  const { data, isLoading, error } = useGetRecentDocumentsQuery({ action: 'update' });
  const { formatMessage } = useIntl();

  return (
    <Widget
      title={{
        id: 'HomePage.widget.last-edited.title',
        defaultMessage: 'Last edited entries',
      }}
      icon={Pencil}
      isLoading={isLoading}
    >
      <Table colCount={5} rowCount={data?.length ?? 4}>
        <Tbody>
          {data?.map((document) => (
            <Tr key={document.documentId}>
              <Td>
                <Typography variant="omega" textColor="neutral800">
                  {document.title}
                </Typography>
              </Td>
              <Td>
                <Typography variant="omega" textColor="neutral600">
                  {document.kind === 'singleType'
                    ? formatMessage({
                        id: 'HomePage.widget.last-edited.single-type',
                        defaultMessage: 'Single-Type',
                      })
                    : // TODO check how to localize display name
                      document.modelDisplayName}
                </Typography>
              </Td>
              <Td>
                <Box display="inline-block">
                  <DocumentStatus status={document.status} />
                </Box>
              </Td>
              <Td>
                <Typography textColor="neutral600">
                  <RelativeTime timestamp={new Date(document.updatedAt)} />
                </Typography>
              </Td>
              <Td>
                <Box display="inline-block">
                  <IconButton
                    tag={Link}
                    to={getEditViewLink(document)}
                    label="Edit"
                    variant="ghost"
                    borderWidth="0px !important"
                  >
                    <Pencil />
                  </IconButton>
                </Box>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Widget>
  );
};

export { LastEditedWidget };
