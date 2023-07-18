import React, { useEffect, useState } from 'react';

import { Badge, Flex, Loader, Typography, useNotifyAT } from '@strapi/design-system';
import { Menu } from '@strapi/design-system/v2';
import { useFetchClient } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import styled from 'styled-components';

import { getRequestUrl, getTrad } from '../../../../../utils';
import CellValue from '../CellValue';

const RelationMultiple = ({ fieldSchema, metadatas, name, entityId, value, contentType }) => {
  const { formatMessage } = useIntl();
  const { notifyStatus } = useNotifyAT();
  const [isOpen, setIsOpen] = useState(false);

  const { get } = useFetchClient();

  const { data, status } = useQuery(
    [fieldSchema.targetModel, entityId],
    async () => {
      const {
        data: { results, pagination },
      } = await get(
        getRequestUrl(`relations/${contentType.uid}/${entityId}/${name.split('.')[0]}`)
      );

      return { results, pagination };
    },
    {
      enabled: isOpen,
      staleTime: 0,
      select: (data) => ({
        ...data,
        results: [...data.results].reverse(),
      }),
    }
  );

  useEffect(() => {
    if (data) {
      notifyStatus(
        formatMessage({
          id: getTrad('DynamicTable.relation-loaded'),
          defaultMessage: 'Relations have been loaded',
        })
      );
    }
  }, [data, formatMessage, notifyStatus]);

  return (
    <Menu.Root onOpenChange={(isOpen) => setIsOpen(isOpen)}>
      <MenuTrigger onClick={(e) => e.stopPropagation()}>
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
      </MenuTrigger>
      <Menu.Content>
        {status !== 'success' && (
          <Menu.Item disabled>
            <Loader small>
              {formatMessage({
                id: getTrad('ListViewTable.relation-loading'),
                defaultMessage: 'Relations are loading',
              })}
            </Loader>
          </Menu.Item>
        )}

        {status === 'success' && (
          <>
            {data?.results.map((entry) => (
              <Menu.Item key={entry.id} disabled>
                <TypographyMaxWidth ellipsis>
                  <CellValue
                    type={metadatas.mainField.schema.type}
                    value={entry[metadatas.mainField.name] || entry.id}
                  />
                </TypographyMaxWidth>
              </Menu.Item>
            ))}

            {data?.pagination.total > 10 && (
              <Menu.Item
                aria-disabled
                aria-label={formatMessage({
                  id: getTrad('ListViewTable.relation-more'),
                  defaultMessage: 'This relation contains more entities than displayed',
                })}
              >
                <Typography>…</Typography>
              </Menu.Item>
            )}
          </>
        )}
      </Menu.Content>
    </Menu.Root>
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

const TypographyMaxWidth = styled(Typography)`
  max-width: 500px;
`;

/**
 * TODO: this needs to be solved in the Design-System
 */
const MenuTrigger = styled(Menu.Trigger)`
  svg {
    width: ${6 / 16}rem;
    height: ${4 / 16}rem;
  }
`;

export default RelationMultiple;
