import { Box, Flex, Grid, GridItem } from '@strapi/design-system';

import { useDocLayout } from '../../../../../hooks/useDocumentLayout';
import { InputRenderer } from '../../InputRenderer';

import type { ComponentInputProps } from './Input';

interface NonRepeatableComponentProps extends Omit<ComponentInputProps, 'required' | 'label'> {}

const NonRepeatableComponent = ({ attribute, name }: NonRepeatableComponentProps) => {
  const {
    edit: { components },
  } = useDocLayout();

  const { layout } = components[attribute.component];

  /**
   * TODO: test nesting styles
   */
  return (
    <Box
      background={'neutral100'}
      paddingLeft={6}
      paddingRight={6}
      paddingTop={6}
      paddingBottom={6}
      // hasRadius={isNested}
      // borderColor={isNested ? 'neutral200' : undefined}
    >
      <Flex direction="column" alignItems="stretch" gap={6}>
        {layout.map((row, index) => {
          return (
            <Grid gap={4} key={index}>
              {row.map(({ size, ...field }) => {
                /**
                 * Layouts are built from schemas so they don't understand the complete
                 * schema tree, for components we append the parent name to the field name
                 * because this is the structure for the data & permissions also understand
                 * the nesting involved.
                 */
                const completeFieldName = `${name}.${field.name}`;

                return (
                  <GridItem col={size} key={completeFieldName} s={12} xs={12}>
                    <InputRenderer {...field} name={completeFieldName} />
                  </GridItem>
                );
              })}
            </Grid>
          );
        })}
      </Flex>
    </Box>
  );
};

export { NonRepeatableComponent };
export type { NonRepeatableComponentProps };
