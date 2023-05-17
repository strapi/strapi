import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import { CheckPagePermissions, Link, LinkButton, pxToRem } from '@strapi/helper-plugin';
import {
  Flex,
  Loader,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Pencil, Plus } from '@strapi/icons';

import { useReviewWorkflows } from '../../hooks/useReviewWorkflows';
import adminPermissions from '../../../../../../../../admin/src/permissions';

import * as Layout from '../../components/Layout';

const ActionLink = styled(Link)`
  svg {
    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }

  &:hover,
  &:focus {
    svg {
      path {
        fill: ${({ theme }) => theme.colors.neutral800};
      }
    }
  }
`;

export function ReviewWorkflowsListView() {
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const { workflows: workflowsData } = useReviewWorkflows();

  return (
    <CheckPagePermissions permissions={adminPermissions.settings['review-workflows'].main}>
      <Layout.Header
        primaryAction={
          <LinkButton startIcon={<Plus />} size="S" to="/settings/review-workflows/create">
            {formatMessage({
              id: 'Settings.review-workflows.list.page.create',
              defaultMessage: 'Create new workflow',
            })}
          </LinkButton>
        }
        subtitle={formatMessage({
          id: 'Settings.review-workflows.list.page.subtitle',
          defaultMessage:
            'Manage content review stages and collaborate during content creation from draft to publication',
        })}
        title={formatMessage({
          id: 'Settings.review-workflows.list.page.title',
          defaultMessage: 'Review Workflows',
        })}
      />

      <Layout.Root>
        {workflowsData.status === 'loading' ? (
          <Loader>
            {formatMessage({
              id: 'Settings.review-workflows.page.list.isLoading',
              defaultMessage: 'Workflows are loading',
            })}
          </Loader>
        ) : (
          <Table colCount={3} rowCount={1}>
            <Thead>
              <Tr>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: 'Settings.review-workflows.list.page.list.column.name.title',
                      defaultMessage: 'Name',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: 'Settings.review-workflows.list.page.list.column.stages.title',
                      defaultMessage: 'Stages',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <VisuallyHidden>
                    {formatMessage({
                      id: 'Settings.review-workflows.list.page.list.column.actions.title',
                      defaultMessage: 'Actions',
                    })}
                  </VisuallyHidden>
                </Th>
              </Tr>
            </Thead>

            <Tbody>
              {workflowsData?.data?.map((workflow) => (
                <Tr
                  onRowClick={() => push(`/settings/review-workflows/${workflow.id}`)}
                  key={`workflow-${workflow.id}`}
                >
                  <Td width={pxToRem(250)}>
                    <Typography textColor="neutral800" fontWeight="bold" ellipsis>
                      {formatMessage({
                        id: 'Settings.review-workflows.list.page.list.column.name.defaultName',
                        defaultMessage: 'Default workflow',
                      })}
                    </Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">{workflow.stages.length}</Typography>
                  </Td>
                  <Td>
                    <Flex gap={2} justifyContent="end">
                      <ActionLink
                        to={`/settings/review-workflows/${workflow.id}`}
                        aria-label={formatMessage(
                          {
                            id: 'Settings.review-workflows.list.page.list.column.actions.edit.label',
                            defaultMessage: 'Edit {name}',
                          },
                          { name: 'Default workflow' }
                        )}
                      >
                        <Pencil />
                      </ActionLink>
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Layout.Root>
    </CheckPagePermissions>
  );
}
