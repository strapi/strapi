import {
  Badge,
  Box,
  Flex,
  Loader,
  MenuItem,
  SimpleMenu,
  Typography,
  useNotifyAT,
} from '@strapi/design-system';
import { stopPropagation, useFetchClient } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import React, { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import styled from 'styled-components';
import { getRequestUrl, getTrad } from '../../../../../utils';
import CellValue from '../CellValue';

const TypographyMaxWidth = styled(Typography)`
  max-width: 500px;
`;

const fetchRelation = async (endPoint, notifyStatus, get) => {
  const {
    data: { results, pagination },
  } = await get(endPoint);

  notifyStatus();

  return { results, pagination };
};

const RelationMultiple = ({ fieldSchema, metadatas, name, entityId, value, contentType }) => {
  const { formatMessage } = useIntl();
  const { notifyStatus } = useNotifyAT();
  const relationFetchEndpoint = useMemo(
    () => getRequestUrl(`relations/${contentType.uid}/${entityId}/${name.split('.')[0]}`),
    [entityId, name, contentType]
  );
  const [isOpen, setIsOpen] = useState(false);
  const { get } = useFetchClient();

  const Label = (
    <Flex gap={1} wrap="nowrap">
      <Badge>{value.count}</Badge>
      {formatMessage(
        {
          id: 'content-manager.containers.ListPage.items',
          defaultMessage: '{number, plural, =0 {items} one {item} other {items}}',
        },
        { number: value.count }
      )}
    </Flex>
  );

  const notify = () => {
    const message = formatMessage({
      id: getTrad('DynamicTable.relation-loaded'),
      defaultMessage: 'Relations have been loaded',
    });
    notifyStatus(message);
  };

  const { data, status } = useQuery(
    [fieldSchema.targetModel, entityId],
    () => fetchRelation(relationFetchEndpoint, notify, get),
    {
      enabled: isOpen,
      staleTime: 0,
      select: (data) => ({
        ...data,
        results: [...data.results].reverse(),
      }),
    }
  );

  return (
    <Box {...stopPropagation}>
      <SimpleMenu
        label={Label}
        size="S"
        onOpen={() => setIsOpen(true)}
        onClose={() => setIsOpen(false)}
      >
        {status !== 'success' && (
          <MenuItem aria-disabled>
            <Loader small>
              {formatMessage({
                id: getTrad('DynamicTable.relation-loading'),
                defaultMessage: 'Relations are loading',
              })}
            </Loader>
          </MenuItem>
        )}

        {status === 'success' && (
          <>
            {data?.results.map((entry) => (
              <MenuItem key={entry.id} aria-disabled>
                <TypographyMaxWidth ellipsis>
                  <CellValue
                    type={metadatas.mainField.schema.type}
                    value={entry[metadatas.mainField.name] || entry.id}
                  />
                </TypographyMaxWidth>
              </MenuItem>
            ))}

            {data?.pagination.total > 10 && (
              <MenuItem
                aria-disabled
                aria-label={formatMessage({
                  id: getTrad('DynamicTable.relation-more'),
                  defaultMessage: 'This relation contains more entities than displayed',
                })}
              >
                <Typography>…</Typography>
              </MenuItem>
            )}
          </>
        )}
      </SimpleMenu>
    </Box>
  );
};

RelationMultiple.propTypes = {
  contentType: PropTypes.shape({
    uid: PropTypes.string.isRequired,
  }).isRequired,
  fieldSchema: PropTypes.shape({
    relation: PropTypes.string,
    targetModel: PropTypes.string,
    type: PropTypes.string.isRequired,
  }).isRequired,
  metadatas: PropTypes.shape({
    mainField: PropTypes.shape({
      name: PropTypes.string.isRequired,
      schema: PropTypes.shape({ type: PropTypes.string.isRequired }).isRequired,
    }),
  }).isRequired,
  name: PropTypes.string.isRequired,
  entityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  value: PropTypes.object.isRequired,
};

export default RelationMultiple;
