import * as React from 'react';

import { Box, Flex, KeyboardNavigable, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../utils/translations';

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

  const [categoryToOpen, setCategoryToOpen] = React.useState('');

  React.useEffect(() => {
    const categoryKeys = Object.keys(dynamicComponentsByCategory);

    if (isOpen && categoryKeys.length > 0) {
      setCategoryToOpen(categoryKeys[0]);
    }
  }, [isOpen, dynamicComponentsByCategory]);

  const handleAddComponentToDz = (componentUid: string) => () => {
    onClickAddComponent(componentUid);
    setCategoryToOpen('');
  };

  const handleClickToggle = (categoryName: string) => {
    setCategoryToOpen((currentCat) => (currentCat === categoryName ? '' : categoryName));
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
        <KeyboardNavigable attributeName="data-strapi-accordion-toggle">
          {Object.entries(dynamicComponentsByCategory).map(([category, components], index) => (
            <ComponentCategory
              key={category}
              category={category}
              components={components}
              onAddComponent={handleAddComponentToDz}
              isOpen={category === categoryToOpen}
              onToggle={handleClickToggle}
              variant={index % 2 === 1 ? 'primary' : 'secondary'}
            />
          ))}
        </KeyboardNavigable>
      </Box>
    </Box>
  );
};

export { ComponentPicker };
export type { ComponentPickerProps };
