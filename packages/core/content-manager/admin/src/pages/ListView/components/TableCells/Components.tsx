import { Badge, Tooltip, Typography, Menu } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

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
      <Typography maxWidth="25rem" textColor="neutral800" ellipsis>
        <CellValue type={mainField.type} value={content[mainField.name]} />
      </Typography>
    </Tooltip>
  );
};

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
      <Menu.Trigger onClick={(e) => e.stopPropagation()}>
        <Badge>{content.length}</Badge>
        {formatMessage(
          {
            id: 'content-manager.containers.list.items',
            defaultMessage: '{number, plural, =0 {items} one {item} other {items}}',
          },
          { number: content.length }
        )}
      </Menu.Trigger>
      <Menu.Content>
        {content.map((item) => (
          <Menu.Item key={item.id} disabled>
            <Typography maxWidth="50rem" ellipsis>
              <CellValue type={mainField.type} value={item[mainField.name]} />
            </Typography>
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
};

export { SingleComponent, RepeatableComponent };
export type { SingleComponentProps, RepeatableComponentProps };
