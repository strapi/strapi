import { useField } from '@strapi/admin/strapi-admin';
import { Box, Flex } from '@strapi/design-system';
import { useIntl } from 'react-intl';

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
  const { formatMessage } = useIntl();
  const { value } = useField(name);
  const level = useComponent('NonRepeatableComponent', (state) => state.level);
  const isNested = level > 0;

  return (
    <ComponentProvider id={value?.id} uid={attribute.component} level={level + 1} type="component">
      <Box
        background={'neutral100'}
        paddingLeft={6}
        paddingRight={6}
        paddingTop={6}
        paddingBottom={6}
        hasRadius={isNested}
        borderColor={isNested ? 'neutral200' : undefined}
      >
        <Flex direction="column" alignItems="stretch" gap={6}>
          {layout.map((row, index) => {
            return (
              <ResponsiveGridRoot gap={4} key={index}>
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
                      {children({ ...field, label: translatedLabel, name: completeFieldName })}
                    </ResponsiveGridItem>
                  );
                })}
              </ResponsiveGridRoot>
            );
          })}
        </Flex>
      </Box>
    </ComponentProvider>
  );
};

export { NonRepeatableComponent };
export type { NonRepeatableComponentProps };
