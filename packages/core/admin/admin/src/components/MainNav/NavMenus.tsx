import { Flex, Menu, Typography, VisuallyHidden } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useStrapiApp } from '../../features/StrapiApp';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useRBAC } from '../../hooks/useRBAC';

import { NavLink } from './NavLink';

import type { MainNavMenuArgs } from '../../core/apis/MainNav';

const MenuIcon = styled(Flex)`
  height: ${({ theme }) => theme.spaces[7]};
  width: ${({ theme }) => theme.spaces[7]};
  border-radius: 50%;
`;

const MenuTrigger = styled(Menu.Trigger)`
  padding: 0;

  ${({ theme }) => theme.breakpoints.large} {
    width: 4rem;
    height: 4rem;
    justify-content: center;
  }

  /* An outline with an offset leaves a see-through gap, whatever the navigation background */
  &[data-state='open'] ${MenuIcon} {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: 2px;
  }
`;

const ReadOnlyValue = styled(Flex)`
  ${({ theme }) => theme.breakpoints.large} {
    width: 4rem;
    height: 4rem;
    justify-content: center;
  }
`;

const MenuContent = styled(Menu.Content)`
  max-height: min(48rem, 70dvh);
  min-width: 24rem;
`;

const NO_PERMISSIONS: NonNullable<MainNavMenuArgs['permissions']> = [];

interface NavMenuProps {
  menu: MainNavMenuArgs;
  showLabel: boolean;
}

const NavMenu = ({ menu, showLabel }: NavMenuProps) => {
  const permissions = menu.permissions ?? NO_PERMISSIONS;
  const { allowedActions, isLoading } = useRBAC(permissions);

  if (permissions.length > 0 && (isLoading || !Object.values(allowedActions).some(Boolean))) {
    return null;
  }

  // Rendered apart so `useCurrent` only runs for users who see the menu, as it may fetch data
  return <NavMenuImpl menu={menu} showLabel={showLabel} />;
};

const NavMenuImpl = ({ menu: { intlLabel, useCurrent, Content }, showLabel }: NavMenuProps) => {
  const { formatMessage } = useIntl();
  const isDesktop = useIsDesktop();
  const current = useCurrent();

  if (!current) {
    return null;
  }

  const name = formatMessage(
    { id: 'app.components.LeftMenu.menu.current', defaultMessage: '{label}: {current}' },
    { label: formatMessage(intlLabel), current: current.label }
  );

  const value = (
    <Flex alignItems="center" gap={3}>
      <MenuIcon justifyContent="center" aria-hidden>
        {current.icon}
      </MenuIcon>
      {showLabel ? (
        <Typography variant="omega">{name}</Typography>
      ) : (
        <VisuallyHidden tag="span">{name}</VisuallyHidden>
      )}
    </Flex>
  );

  // With its label shown, as in the mobile menu, the value needs no tooltip
  const withTooltip = (node: React.ReactNode) =>
    showLabel ? node : <NavLink.Tooltip label={name}>{node}</NavLink.Tooltip>;

  if (current.readOnly) {
    return withTooltip(<ReadOnlyValue>{value}</ReadOnlyValue>);
  }

  return (
    <Menu.Root>
      {withTooltip(
        <MenuTrigger endIcon={null} fullWidth justifyContent="flex-start">
          {value}
        </MenuTrigger>
      )}
      <MenuContent popoverPlacement={isDesktop ? 'right-end' : 'top-start'} zIndex={3}>
        <Content />
      </MenuContent>
    </Menu.Root>
  );
};

interface NavMenusProps {
  /** Shows the name next to the trigger icon, as in the mobile menu */
  showLabel?: boolean;
}

/**
 * The menus plugins add at the bottom of the main navigation, above the profile menu
 */
const NavMenus = ({ showLabel = false }: NavMenusProps) => {
  const menus = useStrapiApp('NavMenus', (state) => state.mainNav.menus);

  return (
    <>
      {menus.map((menu) => (
        <NavMenu key={menu.id} menu={menu} showLabel={showLabel} />
      ))}
    </>
  );
};

export { NavMenus };
