import * as React from 'react';

import { Menu, lightTheme } from '@strapi/design-system';
import { Earth } from '@strapi/icons';
import { act, render, screen } from '@tests/utils';

import { MainNav, type MainNavMenuArgs, type MainNavMenuCurrent } from '../../../core/apis/MainNav';
import { NavMenus } from '../NavMenus';

jest.mock('../../../hooks/useMediaQuery', () => ({
  useIsDesktop: jest.fn(() => true),
}));

const onSelect = jest.fn();

const SpaceItems = () => (
  <>
    <Menu.Item onSelect={() => onSelect('control-center')}>Control center</Menu.Item>
    <Menu.Item onSelect={() => onSelect('france')}>France</Menu.Item>
  </>
);

const renderMenus = (menu: Partial<MainNavMenuArgs> = {}, { showLabel = false } = {}) => {
  const mainNav = new MainNav();
  mainNav.addMenu({
    id: 'spaces',
    intlLabel: { id: 'spaces.switcher.label', defaultMessage: 'Space' },
    useCurrent: () => ({ label: 'Control center', icon: <Earth /> }),
    Content: SpaceItems,
    ...menu,
  });

  return render(<NavMenus showLabel={showLabel} />, { providerOptions: { mainNav } });
};

describe('NavMenus', () => {
  beforeEach(() => {
    onSelect.mockClear();
  });

  it('hides the menu while useCurrent returns null', () => {
    renderMenus({ useCurrent: () => null });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/Space/)).not.toBeInTheDocument();
  });

  it('shows a read-only value without a menu', async () => {
    renderMenus({
      useCurrent: () => ({ label: 'Pebble & Pine', icon: <span>PP</span>, readOnly: true }),
    });

    expect(await screen.findByText('Space: Pebble & Pine')).toBeInTheDocument();
    expect(screen.getByText('PP')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('rings the current value while the menu is open', async () => {
    const { user } = renderMenus({
      useCurrent: () => ({ label: 'Control center', icon: <span>CC</span> }),
    });

    const trigger = await screen.findByRole('button', { name: 'Space: Control center' });
    const icon = screen.getByText('CC').parentElement!;

    // Jest does not compile Tailwind, so this checks the classes, and the browser the outline
    expect(trigger).toHaveClass('group/nav-menu');
    expect(icon).toHaveClass(
      'rounded-full',
      'group-data-[state=open]/nav-menu:outline-2',
      'group-data-[state=open]/nav-menu:outline-offset-2'
    );
    // Not the design system default, so an app's custom theme colours the ring
    expect(icon).toHaveStyle({ outlineColor: lightTheme.colors.primary600 });
    expect(trigger).toHaveAttribute('data-state', 'closed');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('data-state', 'open');
  });

  it('shows the current value in the trigger and its accessible name', async () => {
    renderMenus({
      useCurrent: () => ({ label: 'Control center', icon: <span>CC</span> }),
    });

    const trigger = await screen.findByRole('button', { name: 'Space: Control center' });

    expect(trigger).toHaveTextContent('CC');
  });

  it('shows the menu once its current value loads, and follows it', async () => {
    let current: MainNavMenuCurrent | null = null;
    const listeners = new Set<() => void>();
    const subscribe = (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    };

    renderMenus({ useCurrent: () => React.useSyncExternalStore(subscribe, () => current) });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    act(() => {
      current = { label: 'France', icon: <span>FR</span> };
      listeners.forEach((listener) => listener());
    });

    expect(await screen.findByRole('button', { name: 'Space: France' })).toBeInTheDocument();
  });

  it('shows the name in a tooltip, and not when it is shown next to the icon', async () => {
    const { user, unmount } = renderMenus();

    await user.hover(await screen.findByRole('button', { name: 'Space: Control center' }));
    expect((await screen.findAllByRole('tooltip'))[0]).toHaveTextContent('Space: Control center');

    unmount();

    const { user: mobileUser } = renderMenus({}, { showLabel: true });

    await mobileUser.hover(await screen.findByRole('button', { name: 'Space: Control center' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('opens the plugin items and closes once one is selected', async () => {
    const { user } = renderMenus();

    await user.click(await screen.findByRole('button', { name: 'Space: Control center' }));
    await user.click(screen.getByRole('menuitem', { name: 'France' }));

    expect(onSelect).toHaveBeenCalledWith('france');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const { user } = renderMenus();

    await user.click(await screen.findByRole('button', { name: 'Space: Control center' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('[Escape]');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('hides a menu from users without its permissions, without running its useCurrent', async () => {
    const useNotHeldCurrent = jest.fn(() => ({ label: 'France', icon: <span /> }));
    const mainNav = new MainNav();
    const spaces = {
      useCurrent: () => ({ label: 'Control center', icon: <Earth /> }),
      intlLabel: { id: 'spaces.switcher.label', defaultMessage: 'Space' },
      Content: SpaceItems,
    };
    mainNav.addMenu({
      ...spaces,
      id: 'held',
      permissions: [{ action: 'admin::users.read', subject: null } as never],
    });
    mainNav.addMenu({
      ...spaces,
      id: 'not-held',
      intlLabel: { id: 'other.label', defaultMessage: 'Other' },
      permissions: [{ action: 'plugin::spaces.read', subject: null } as never],
      useCurrent: useNotHeldCurrent,
    });

    render(<NavMenus />, { providerOptions: { mainNav } });

    expect(
      await screen.findByRole('button', { name: 'Space: Control center' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Other/ })).not.toBeInTheDocument();
    // Nor while the permissions were loading
    expect(useNotHeldCurrent).not.toHaveBeenCalled();
  });
});
