import * as React from 'react';

import { Typography, Badge, Flex, Loader, useNotifyAT } from '@strapi/design-system';
import { Menu } from '@strapi/design-system/v2';
import { useFetchClient } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import styled from 'styled-components';

import { getTranslation } from '../../../../utils/translations';

import { CellValue } from './CellValue';

import type { CellContentProps } from './CellContent';
import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import type { Entity } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * RelationSingle
 * -----------------------------------------------------------------------------------------------*/

interface RelationSingleProps extends Pick<CellContentProps, 'metadatas' | 'content'> {}

const RelationSingle = ({ metadatas, content }: RelationSingleProps) => {
  return (
    <TypographyMaxWidth textColor="neutral800" ellipsis>
      <CellValue
        // integer is default because that's what the id will be.
        type={metadatas.mainField?.type ?? 'integer'}
        value={metadatas.mainField?.name ? content[metadatas.mainField?.name] : content.id}
      />
    </TypographyMaxWidth>
  );
};

const TypographyMaxWidth = styled(Typography)`
  max-width: 500px;
`;

/* -------------------------------------------------------------------------------------------------
 * RelationMultiple
 * -----------------------------------------------------------------------------------------------*/

interface RelationMultipleProps extends Pick<CellContentProps, 'metadatas' | 'name' | 'content'> {
  entityId: Entity.ID;
  uid: string;
}

const RelationMultiple = ({ metadatas, name, entityId, content, uid }: RelationMultipleProps) => {
  const { formatMessage } = useIntl();
  const { notifyStatus } = useNotifyAT();
  const [isOpen, setIsOpen] = React.useState(false);

  const { get } = useFetchClient();

  const [fieldName] = name.split('.');

  const { data, isLoading } = useQuery(
    [uid, entityId, fieldName],
    async () => {
      const { data } = await get<Contracts.Relations.FindExisting.Response>(
        `/content-manager/relations/${uid}/${entityId}/${fieldName}`
      );

      if ('data' in data && data.data) {
        return {
          results: [data.data],
        };
      }

      if ('results' in data) {
        return { results: data.results, pagination: data.pagination };
      }

      throw new Error(
        `/content-manager/relations/${uid}/${entityId}/${fieldName} returned an error object with a success code.`
      );
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

  React.useEffect(() => {
    if (data) {
      notifyStatus(
        formatMessage({
          id: getTranslation('DynamicTable.relation-loaded'),
          defaultMessage: 'Relations have been loaded',
        })
      );
    }
  }, [data, formatMessage, notifyStatus]);

  return (
    <Menu.Root onOpenChange={(isOpen) => setIsOpen(isOpen)}>
      <MenuTrigger onClick={(e) => e.stopPropagation()}>
        <Flex gap={1} wrap="nowrap">
          <Badge>{content.count}</Badge>
          {formatMessage(
            {
              id: 'content-manager.containers.ListPage.items',
              defaultMessage: '{number, plural, =0 {items} one {item} other {items}}',
            },
            { number: content.count }
          )}
        </Flex>
      </MenuTrigger>
      <Menu.Content>
        {isLoading && (
          <Menu.Item disabled>
            <Loader small>
              {formatMessage({
                id: getTranslation('ListViewTable.relation-loading'),
                defaultMessage: 'Relations are loading',
              })}
            </Loader>
          </Menu.Item>
        )}

        {data?.results && (
          <>
            {data.results.map((entry) => (
              <Menu.Item key={entry.id} disabled>
                <TypographyMaxWidth ellipsis>
                  <CellValue
                    type={metadatas.mainField?.type ?? 'integer'}
                    // @ts-expect-error – can't use a string to index the RelationResult object.
                    value={metadatas.mainField?.name ? entry[metadatas.mainField.name] : entry.id}
                  />
                </TypographyMaxWidth>
              </Menu.Item>
            ))}

            {data?.pagination && data?.pagination.total > 10 && (
              <Menu.Item
                aria-disabled
                aria-label={formatMessage({
                  id: getTranslation('ListViewTable.relation-more'),
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

/**
 * TODO: this needs to be solved in the Design-System
 */
const MenuTrigger = styled(Menu.Trigger)`
  svg {
    width: ${6 / 16}rem;
    height: ${4 / 16}rem;
  }
`;

export { RelationSingle, RelationMultiple };
export type { RelationSingleProps, RelationMultipleProps };
