import { useIsMobile } from '@strapi/admin/strapi-admin';
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
  const isMobile = useIsMobile();

  const handleAddComponentToDz = (componentUid: string) => () => {
    onClickAddComponent(componentUid);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Flex
      paddingTop={{ initial: 0, medium: 6 }}
      paddingBottom={{ initial: 0, medium: 6 }}
      paddingLeft={{ initial: 0, medium: 5 }}
      paddingRight={{ initial: 0, medium: 5 }}
      background={isMobile ? 'transparent' : 'neutral0'}
      shadow={isMobile ? 'none' : 'tableShadow'}
      borderColor={isMobile ? 'transparent' : 'neutral150'}
      hasRadius={!isMobile}
      gap={{ initial: 4, medium: 2 }}
      direction="column"
      alignItems="stretch"
    >
      <Flex justifyContent="center">
        <Typography fontWeight="bold" textColor="neutral600" fontSize={1}>
          {formatMessage({
            id: getTranslation('components.DynamicZone.ComponentPicker-label'),
            defaultMessage: 'Pick one component',
          })}
        </Typography>
      </Flex>
      <Box>
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
    </Flex>
  );
};

export { ComponentPicker };
export type { ComponentPickerProps };
