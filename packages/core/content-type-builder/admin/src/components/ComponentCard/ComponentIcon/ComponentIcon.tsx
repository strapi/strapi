import { Flex, Icon } from '@strapi/design-system';

import { COMPONENT_ICONS } from '../../IconPicker/constants';

interface ComponentIconProps {
  isActive?: boolean;
  icon?: keyof typeof COMPONENT_ICONS;
}

export const ComponentIcon = ({ isActive = false, icon = 'cube' }: ComponentIconProps) => {
  return (
    <Flex
      alignItems="center"
      background={isActive ? 'primary200' : 'neutral200'}
      justifyContent="center"
      height={8}
      width={8}
      borderRadius="50%"
    >
      <Icon as={COMPONENT_ICONS[icon] || COMPONENT_ICONS.cube} height={5} width={5} />
    </Flex>
  );
};
