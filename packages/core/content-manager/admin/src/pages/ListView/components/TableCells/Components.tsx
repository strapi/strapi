import { Badge, Tooltip, Typography } from '@strapi/design-system';
import { Menu } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { CellContentProps } from './CellContent';
import { CellValue } from './CellValue';

import type { Schema } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * SingleComponent
 * -----------------------------------------------------------------------------------------------*/

interface SingleComponentProps extends Pick<CellContentProps, 'mainField'> {
  content: Schema.Attribute.Value<Schema.Attribute.Component<`${string}.${string}`, false>>;
}

const SingleComponent = ({ content, mainField }: SingleComponentProps) => {
  if (!mainField) {
    return null;
  }

  return (
    <Tooltip label={content[mainField.name]}>
      <SingleComponentTypography textColor="neutral800" ellipsis>
        <CellValue type={mainField.type} value={content[mainField.name]} />
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
  content: Schema.Attribute.Value<Schema.Attribute.Component<`${string}.${string}`, true>>;
}

const RepeatableComponent = ({ content, mainField }: RepeatableComponentProps) => {
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
            id: 'content-manager.containers.list.items',
            defaultMessage: '{number, plural, =0 {items} one {item} other {items}}',
          },
          { number: content.length }
        )}
      </MenuTrigger>
      <Menu.Content>
        {content.map((item) => (
          <Menu.Item key={item.id} disabled>
            <RepeatableComponentTypography ellipsis>
              <CellValue type={mainField.type} value={item[mainField.name]} />
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
    width: 0.6rem;
    height: 0.4rem;
  }
`;

export { SingleComponent, RepeatableComponent };
export type { SingleComponentProps, RepeatableComponentProps };
