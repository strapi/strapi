import { Flex } from '@strapi/design-system';

import { COMPONENT_ICONS } from '../../IconPicker/constants';

interface ComponentIconProps {
  isActive?: boolean;
  icon?: keyof typeof COMPONENT_ICONS;
}

export const ComponentIcon = ({ isActive = false, icon = 'dashboard' }: ComponentIconProps) => {
  const Icon = COMPONENT_ICONS[icon] || COMPONENT_ICONS.dashboard;

  return (
    <Flex
      alignItems="center"
      background={isActive ? 'primary200' : 'neutral200'}
      justifyContent="center"
      height={8}
      width={8}
      borderRadius="50%"
    >
      <Icon height="2rem" width="2rem" />
    </Flex>
  );
};
