import * as React from 'react';

import { useField, createRulesEngine } from '@strapi/admin/strapi-admin';
import { Box, Flex } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useDocumentContext } from '../../../../../hooks/useDocumentContext';
import { type EditFieldLayout } from '../../../../../hooks/useDocumentLayout';
import { ResponsiveGridItem, ResponsiveGridRoot } from '../../FormLayout';
import { ComponentProvider, useComponent } from '../ComponentContext';

import type { ComponentInputProps } from './Input';

type NonRepeatableComponentProps = Omit<ComponentInputProps, 'required' | 'label'>;
type LabelActionProp = React.ReactNode;

const renderLabelAction = (
  labelAction: LabelActionProp,
  args: {
    name: string;
    attribute: unknown;
  }
): React.ReactNode => {
  if (React.isValidElement(labelAction)) {
    const element = labelAction as React.ReactElement;
    return React.createElement(element.type as React.ComponentType<Record<string, unknown>>, {
      ...element.props,
      ...args,
    });
  }

  return labelAction as React.ReactNode;
};

type FieldWithLabelAction = EditFieldLayout & { labelAction?: LabelActionProp };

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
  const { currentDocument } = useDocumentContext('NonRepeatableComponent');
  const rulesEngine = createRulesEngine();

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
            const visibleFields = row.filter(({ ...field }) => {
              const condition = field.attribute.conditions?.visible;
              if (condition) {
                return rulesEngine.evaluate(condition, value);
              }

              return true;
            });

            if (visibleFields.length === 0) {
              return null; // Skip rendering the entire grid row
            }
            return (
              <ResponsiveGridRoot gap={4} key={index}>
                {visibleFields.map(({ size, ...field }) => {
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

                  const clonedLabelAction = renderLabelAction(
                    (field as FieldWithLabelAction).labelAction,
                    {
                      name: completeFieldName,
                      attribute: field.attribute,
                    }
                  );

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
                        labelAction: clonedLabelAction,
                        document: currentDocument,
                      })}
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
