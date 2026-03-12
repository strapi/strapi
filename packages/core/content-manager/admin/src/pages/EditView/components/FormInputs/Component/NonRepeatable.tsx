import * as React from 'react';

import { useForm, useIsMobile } from '@strapi/admin/strapi-admin';
import { Box, Flex } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getIn } from '../../../../../utils/objects';
import { ResponsiveGridItem, ResponsiveGridRoot } from '../../FormLayout';
import { ComponentProvider, useComponent } from '../ComponentContext';

import type { ComponentInputProps } from './Input';

type NonRepeatableComponentProps = Omit<ComponentInputProps, 'required' | 'label'>;

const NonRepeatableComponent = ({
  attribute,
  name,
  children,
  layout,
}: NonRepeatableComponentProps) => {
  const componentId = useForm(
    'NonRepeatableComponent',
    (state) => getIn(state.values, `${name}.id`) as number | undefined
  );
  const level = useComponent('NonRepeatableComponent', (state) => state.level);
  const isNested = level > 0;
  const isMobile = useIsMobile();

  return (
    <ComponentProvider
      id={componentId}
      uid={attribute.component}
      level={level + 1}
      type="component"
    >
      <Box
        background={'neutral100'}
        padding={{ initial: 4, medium: 6 }}
        hasRadius={isNested}
        borderColor={isNested || isMobile ? 'neutral200' : undefined}
      >
        <NonRepeatableComponentFields attribute={attribute} name={name} layout={layout}>
          {children}
        </NonRepeatableComponentFields>
      </Box>
    </ComponentProvider>
  );
};

interface NonRepeatableComponentFieldsProps
  extends Pick<NonRepeatableComponentProps, 'attribute' | 'children' | 'layout' | 'name'> {}

const NonRepeatableComponentFields = React.memo(
  ({ attribute, children, layout, name }: NonRepeatableComponentFieldsProps) => {
    const { formatMessage } = useIntl();

    return (
      <Flex direction="column" alignItems="stretch" gap={6}>
        {layout.map((row, index) => {
          return (
            <ResponsiveGridRoot gap={{ initial: 3, medium: 4 }} key={index}>
              {row.map(({ size, ...field }) => {
                /**
                 * Layouts are built from schemas so they don't understand the complete
                 * schema tree, for components we append the parent name to the field name
                 * because this is the structure for the data & permissions also understand
                 * the nesting involved.
                 */
                const completeFieldName = `${name}.${field.name}`;

                const translatedLabel = formatMessage({
                  id: `content-manager.components.${attribute.component}.${field.name}`,
                  defaultMessage: field.label,
                });

                return (
                  <ResponsiveGridItem
                    col={size}
                    key={completeFieldName}
                    s={12}
                    xs={12}
                    direction="column"
                    alignItems="stretch"
                  >
                    {children({
                      ...field,
                      label: translatedLabel,
                      name: completeFieldName,
                    })}
                  </ResponsiveGridItem>
                );
              })}
            </ResponsiveGridRoot>
          );
        })}
      </Flex>
    );
  }
);

NonRepeatableComponentFields.displayName = 'NonRepeatableComponentFields';

const MemoizedNonRepeatableComponent = React.memo(NonRepeatableComponent);

export { MemoizedNonRepeatableComponent as NonRepeatableComponent };
export type { NonRepeatableComponentProps };
