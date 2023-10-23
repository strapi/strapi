import React from 'react';

import {
  BaseCheckbox,
  IconButton,
  Tbody,
  Td,
  Tr,
  Flex,
  Status,
  Typography,
} from '@strapi/design-system';
import {
  useTracking,
  useFetchClient,
  useAPIErrorHandler,
  useQueryParams,
} from '@strapi/helper-plugin';
import { Trash, Duplicate, Pencil } from '@strapi/icons';
import { AxiosError } from 'axios';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Link, useHistory } from 'react-router-dom';

import { useEnterprise } from '../../../../../hooks/useEnterprise';
import { getFullName } from '../../../../../utils/getFullName';
import { usePluginsQueryParams } from '../../../../hooks';
import { getTrad } from '../../../../utils';
import CellContent from '../CellContent';

const REVIEW_WORKFLOW_COLUMNS_CE = () => null;

export const TableRows = ({
  canCreate,
  canDelete,
  contentType,
  features: { hasDraftAndPublish, hasReviewWorkflows },
  headers,
  entriesToDelete,
  onClickDelete,
  onSelectRow,
  withMainAction,
  withBulkActions,
  rows,
}) => {
  const { push, location } = useHistory();
  const { pathname } = location;
  const { formatMessage } = useIntl();
  const { post } = useFetchClient();

  const { trackUsage } = useTracking();
  const pluginsQueryParams = usePluginsQueryParams();
  const [{ query }] = useQueryParams();
  const { formatAPIError } = useAPIErrorHandler(getTrad);
  const ReviewWorkflowsStage = useEnterprise(
    REVIEW_WORKFLOW_COLUMNS_CE,
    async () =>
      (
        await import(
          '../../../../../../../ee/admin/content-manager/pages/ListView/ReviewWorkflowsColumn'
        )
      ).ReviewWorkflowsStageEE,
    {
      enabled: hasReviewWorkflows,
    }
  );

  /**
   *
   * @param {string} id
   * @returns void
   */
  const handleRowClick = (id) => () => {
    if (!withBulkActions) return;

    trackUsage('willEditEntryFromList');
    push({
      pathname: `${pathname}/${id}`,
      state: { from: pathname },
      search: pluginsQueryParams,
    });
  };

  const handleCloneClick = (id) => async () => {
    try {
      const { data } = await post(
        `/content-manager/collection-types/${contentType.uid}/auto-clone/${id}`,
        {},
        { params: { plugins: query?.plugins } }
      );

      if ('id' in data) {
        push({
          pathname: `${pathname}/${data.id}`,
          state: { from: pathname },
          search: pluginsQueryParams,
        });
      }
    } catch (err) {
      if (err instanceof AxiosError) {
        push({
          pathname: `${pathname}/create/clone/${id}`,
          state: { from: pathname, error: formatAPIError(err) },
          search: pluginsQueryParams,
        });
      }
    }
  };

  // block rendering until the review stage component is fully loaded in EE
  if (!ReviewWorkflowsStage) {
    return null;
  }

  /**
   * Table Cells with actions e.g edit, delete, duplicate have `stopPropagation`
   * to prevent the row from being selected.
   */
  return (
    <Tbody>
      {rows.map((data, index) => {
        const isChecked = entriesToDelete.includes(data.id);
        const itemLineText = formatMessage(
          {
            id: 'content-manager.components.DynamicTable.row-line',
            defaultMessage: 'item line {number}',
          },
          { number: index }
        );

        return (
          <Tr
            cursor={withBulkActions ? 'pointer' : 'default'}
            key={data.id}
            onClick={handleRowClick(data.id)}
          >
            {withMainAction && (
              <Td onClick={(e) => e.stopPropagation()}>
                <BaseCheckbox
                  aria-label={formatMessage(
                    {
                      id: 'app.component.table.select.one-entry',
                      defaultMessage: `Select {target}`,
                    },
                    { target: getFullName(data.firstname, data.lastname) }
                  )}
                  checked={isChecked}
                  onChange={() => {
                    onSelectRow({ name: data.id, value: !isChecked });
                  }}
                />
              </Td>
            )}

            {headers.map(({ key, cellFormatter, name, ...rest }) => {
              if (hasDraftAndPublish && name === 'publishedAt') {
                return (
                  <Td key={key}>
                    <Status
                      width="min-content"
                      showBullet={false}
                      variant={data.publishedAt ? 'success' : 'secondary'}
                      size="S"
                    >
                      <Typography
                        fontWeight="bold"
                        textColor={`${data.publishedAt ? 'success' : 'secondary'}700`}
                      >
                        {formatMessage({
                          id: getTrad(
                            `containers.List.${data.publishedAt ? 'published' : 'draft'}`
                          ),
                          defaultMessage: data.publishedAt ? 'Published' : 'Draft',
                        })}
                      </Typography>
                    </Status>
                  </Td>
                );
              }

              if (hasReviewWorkflows && name === 'strapi_reviewWorkflows_stage') {
                return (
                  <Td key={key}>
                    {data.strapi_reviewWorkflows_stage ? (
                      <ReviewWorkflowsStage
                        color={data.strapi_reviewWorkflows_stage.color}
                        name={data.strapi_reviewWorkflows_stage.name}
                      />
                    ) : (
                      <Typography textColor="neutral800">-</Typography>
                    )}
                  </Td>
                );
              }

              if (typeof cellFormatter === 'function') {
                return <Td key={key}>{cellFormatter(data, { key, name, ...rest })}</Td>;
              }

              return (
                <Td key={key}>
                  <CellContent
                    content={data[name.split('.')[0]]}
                    name={name}
                    contentType={contentType}
                    {...rest}
                    rowId={data.id}
                  />
                </Td>
              );
            })}

            {withBulkActions && (
              <Td>
                <Flex as="span" justifyContent="end" gap={1} onClick={(e) => e.stopPropagation()}>
                  <IconButton
                    forwardedAs={Link}
                    onClick={() => {
                      trackUsage('willEditEntryFromButton');
                    }}
                    to={{
                      pathname: `${pathname}/${data.id}`,
                      state: { from: pathname },
                      search: pluginsQueryParams,
                    }}
                    label={formatMessage(
                      { id: 'app.component.table.edit', defaultMessage: 'Edit {target}' },
                      { target: itemLineText }
                    )}
                    noBorder
                  >
                    <Pencil />
                  </IconButton>

                  {canCreate && (
                    <IconButton
                      onClick={handleCloneClick(data.id)}
                      label={formatMessage(
                        {
                          id: 'app.component.table.duplicate',
                          defaultMessage: 'Duplicate {target}',
                        },
                        { target: itemLineText }
                      )}
                      noBorder
                    >
                      <Duplicate />
                    </IconButton>
                  )}

                  {canDelete && (
                    <IconButton
                      onClick={() => {
                        trackUsage('willDeleteEntryFromList');
                        onClickDelete(data.id);
                      }}
                      label={formatMessage(
                        { id: 'global.delete-target', defaultMessage: 'Delete {target}' },
                        { target: itemLineText }
                      )}
                      noBorder
                    >
                      <Trash />
                    </IconButton>
                  )}
                </Flex>
              </Td>
            )}
          </Tr>
        );
      })}
    </Tbody>
  );
};

TableRows.defaultProps = {
  canCreate: false,
  canDelete: false,
  entriesToDelete: [],
  onClickDelete() {},
  onSelectRow() {},
  rows: [],
  withBulkActions: false,
  withMainAction: false,
};

TableRows.propTypes = {
  canCreate: PropTypes.bool,
  canDelete: PropTypes.bool,
  contentType: PropTypes.shape({
    uid: PropTypes.string.isRequired,
  }).isRequired,
  entriesToDelete: PropTypes.array,
  features: PropTypes.shape({
    hasDraftAndPublish: PropTypes.bool.isRequired,
    hasReviewWorkflows: PropTypes.bool.isRequired,
  }).isRequired,
  headers: PropTypes.array.isRequired,
  onClickDelete: PropTypes.func,
  onSelectRow: PropTypes.func,
  rows: PropTypes.array,
  withBulkActions: PropTypes.bool,
  withMainAction: PropTypes.bool,
};
