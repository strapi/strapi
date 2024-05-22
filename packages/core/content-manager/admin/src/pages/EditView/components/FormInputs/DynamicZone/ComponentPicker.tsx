import * as React from 'react';

import { Box, Flex, Accordion, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../../../../utils/translations';

import { ComponentCategory, ComponentCategoryProps } from './ComponentCategory';

interface ComponentPickerProps {
  dynamicComponentsByCategory?: Record<string, NonNullable<ComponentCategoryProps['components']>>;
  isOpen?: boolean;
  onClickAddComponent: (componentUid: string) => void;
}

const ComponentPicker = ({
  dynamicComponentsByCategory = {},
  isOpen,
  onClickAddComponent,
}: ComponentPickerProps) => {
  const { formatMessage } = useIntl();

  const handleAddComponentToDz = (componentUid: string) => () => {
    onClickAddComponent(componentUid);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Box
      paddingTop={6}
      paddingBottom={6}
      paddingLeft={5}
      paddingRight={5}
      background="neutral0"
      shadow="tableShadow"
      borderColor="neutral150"
      hasRadius
    >
      <Flex justifyContent="center">
        <Typography fontWeight="bold" textColor="neutral600">
          {formatMessage({
            id: getTranslation('components.DynamicZone.ComponentPicker-label'),
            defaultMessage: 'Pick one component',
          })}
        </Typography>
      </Flex>
      <Box paddingTop={2}>
        <Accordion.Root defaultValue={Object.keys(dynamicComponentsByCategory)[0]}>
          {Object.entries(dynamicComponentsByCategory).map(([category, components], index) => (
            <ComponentCategory
              key={category}
              category={category}
              components={components}
              onAddComponent={handleAddComponentToDz}
              variant={index % 2 === 1 ? 'primary' : 'secondary'}
            />
          ))}
        </Accordion.Root>
      </Box>
    </Box>
  );
};

export { ComponentPicker };
export type { ComponentPickerProps };
