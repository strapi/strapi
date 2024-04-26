import * as React from 'react';

import { Typography, Badge, Flex, Loader, useNotifyAT } from '@strapi/design-system';
import { Menu } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { useDoc } from '../../../../hooks/useDocument';
import { useGetRelationsQuery } from '../../../../services/relations';
import { getRelationLabel } from '../../../../utils/relations';
import { getTranslation } from '../../../../utils/translations';

import type { CellContentProps } from './CellContent';

/* -------------------------------------------------------------------------------------------------
 * RelationSingle
 * -----------------------------------------------------------------------------------------------*/

interface RelationSingleProps extends Pick<CellContentProps, 'mainField' | 'content'> {}

const RelationSingle = ({ mainField, content }: RelationSingleProps) => {
  return (
    <TypographyMaxWidth textColor="neutral800" ellipsis>
      {getRelationLabel(content, mainField)}
    </TypographyMaxWidth>
  );
};

const TypographyMaxWidth = styled(Typography)`
  max-width: 500px;
`;

/* -------------------------------------------------------------------------------------------------
 * RelationMultiple
 * -----------------------------------------------------------------------------------------------*/

interface RelationMultipleProps
  extends Pick<CellContentProps, 'mainField' | 'content' | 'name' | 'rowId'> {}

/**
 * TODO: fix this component – tracking issue https://strapi-inc.atlassian.net/browse/CONTENT-2184
 */
const RelationMultiple = ({ mainField, content, rowId, name }: RelationMultipleProps) => {
  const { model } = useDoc();
  const { formatMessage } = useIntl();
  const { notifyStatus } = useNotifyAT();
  const [isOpen, setIsOpen] = React.useState(false);

  const [targetField] = name.split('.');

  const { data, isLoading } = useGetRelationsQuery(
    {
      model,
      id: rowId,
      targetField,
    },
    {
      skip: !isOpen,
      refetchOnMountOrArgChange: true,
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
              id: 'content-manager.containers.list.items',
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
              <Menu.Item key={entry.documentId} disabled>
                <TypographyMaxWidth ellipsis>
                  {getRelationLabel(entry, mainField)}
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
    width: 0.6rem;
    height: 0.4rem;
  }
`;

export { RelationSingle, RelationMultiple };
export type { RelationSingleProps, RelationMultipleProps };
