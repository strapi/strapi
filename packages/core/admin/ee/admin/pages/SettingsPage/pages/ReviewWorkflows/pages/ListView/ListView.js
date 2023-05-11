import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { CheckPagePermissions, Link, pxToRem, SettingsPageTitle } from '@strapi/helper-plugin';
import {
  ContentLayout,
  Flex,
  HeaderLayout,
  Layout,
  Loader,
  Main,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Pencil } from '@strapi/icons';

import { reducer, initialState } from '../../reducer';
import { REDUX_NAMESPACE } from '../../constants';
import { useInjectReducer } from '../../../../../../../../admin/src/hooks/useInjectReducer';
import { useReviewWorkflows } from '../../hooks/useReviewWorkflows';
import { setWorkflows } from '../../actions';
import adminPermissions from '../../../../../../../../admin/src/permissions';

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
  const dispatch = useDispatch();
  const { status, serverState } = useSelector((state) => state?.[REDUX_NAMESPACE] ?? initialState);

  useInjectReducer(REDUX_NAMESPACE, reducer);

  useEffect(() => {
    dispatch(setWorkflows({ status: workflowsData.status, data: workflowsData.data }));
  }, [workflowsData.status, workflowsData.data, dispatch]);

  return (
    <CheckPagePermissions permissions={adminPermissions.settings['review-workflows'].main}>
      <Layout>
        <SettingsPageTitle
          name={formatMessage({
            id: 'Settings.review-workflows.page.title',
            defaultMessage: 'Review Workflows',
          })}
        />
        <Main tabIndex={-1}>
          <HeaderLayout
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

          <ContentLayout>
            {status === 'loading' && (
              <Loader>
                {formatMessage({
                  id: 'Settings.review-workflows.page.list.isLoading',
                  defaultMessage: 'Workflows are loading',
                })}
              </Loader>
            )}

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
                {serverState?.workflows.map((workflow) => (
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
          </ContentLayout>
        </Main>
      </Layout>
    </CheckPagePermissions>
  );
}
