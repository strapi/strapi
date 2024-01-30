import { Badge, Tooltip, Typography } from '@strapi/design-system';
import { Menu } from '@strapi/design-system/v2';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { CellContentProps } from './CellContent';
import { CellValue } from './CellValue';

import type { ComponentsDictionary } from '../../../../hooks/useDocument';
import type { Attribute } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * SingleComponent
 * -----------------------------------------------------------------------------------------------*/

interface SingleComponentProps extends Pick<CellContentProps, 'mainField'> {
  content: Attribute.GetValue<Attribute.Component>;
  schema: ComponentsDictionary[string];
}

const SingleComponent = ({ content, mainField, schema }: SingleComponentProps) => {
  if (!mainField) {
    return null;
  }

  return (
    <Tooltip label={content[mainField]}>
      <SingleComponentTypography textColor="neutral800" ellipsis>
        <CellValue type={schema.attributes[mainField].type} value={content[mainField]} />
      </SingleComponentTypography>
    </Tooltip>
  );
};

const SingleComponentTypography = styled(Typography)`
  max-width: 250px;
`;

/* -------------------------------------------------------------------------------------------------
 * RepeatableComponent
 * -----------------------------------------------------------------------------------------------*/

interface RepeatableComponentProps extends Pick<CellContentProps, 'mainField'> {
  content: Attribute.GetValue<Attribute.Component<`${string}.${string}`, true>>;
  schema: ComponentsDictionary[string];
}

const RepeatableComponent = ({ content, mainField, schema }: RepeatableComponentProps) => {
  const { formatMessage } = useIntl();

  if (!mainField) {
    return null;
  }

  return (
    <Menu.Root>
      <MenuTrigger onClick={(e) => e.stopPropagation()}>
        <Badge>{content.length}</Badge>{' '}
        {formatMessage(
          {
            id: 'content-manager.containers.ListPage.items',
            defaultMessage: '{number, plural, =0 {items} one {item} other {items}}',
          },
          { number: content.length }
        )}
      </MenuTrigger>
      <Menu.Content>
        {content.map((item) => (
          <Menu.Item key={item.id} disabled>
            <RepeatableComponentTypography ellipsis>
              <CellValue type={schema.attributes[mainField].type} value={item[mainField]} />
            </RepeatableComponentTypography>
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
};

const RepeatableComponentTypography = styled(Typography)`
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

export { SingleComponent, RepeatableComponent };
export type { SingleComponentProps, RepeatableComponentProps };
