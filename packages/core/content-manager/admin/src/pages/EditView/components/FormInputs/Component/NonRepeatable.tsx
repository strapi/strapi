import { useField } from '@strapi/admin/strapi-admin';
import { Box, Flex } from '@strapi/design-system';

import { useDocLayout } from '../../../../../hooks/useDocumentLayout';
import { ComponentProvider, useComponent } from '../ComponentContext';

import { ComponentLayout } from './Layout';

import type { ComponentInputProps } from './Input';

type NonRepeatableComponentProps = Omit<ComponentInputProps, 'required' | 'label'>;

const NonRepeatableComponent = ({
  attribute,
  name,
  children,
  layout,
}: NonRepeatableComponentProps) => {
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
          <ComponentLayout layout={layout} name={name}>
            {(inputProps) => children(inputProps)}
          </ComponentLayout>
        </Flex>
      </Box>
    </ComponentProvider>
  );
};

export { NonRepeatableComponent };
export type { NonRepeatableComponentProps };
