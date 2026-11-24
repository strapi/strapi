import * as React from 'react';

import { Menu } from '@strapi/design-system';
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
    icon: Earth,
    intlLabel: { id: 'spaces.switcher.label', defaultMessage: 'Space' },
    Content: SpaceItems,
    ...menu,
  });

  return render(<NavMenus showLabel={showLabel} />, { providerOptions: { mainNav } });
};

describe('NavMenus', () => {
  beforeEach(() => {
    onSelect.mockClear();
  });

  it('names the trigger after the menu while there is no current value', async () => {
    renderMenus();

    expect(await screen.findByRole('button', { name: 'Space' })).toBeInTheDocument();
  });

  it('shows the current value in the trigger and its accessible name', async () => {
    renderMenus({
      useCurrent: () => ({ label: 'Control center', icon: <span>CC</span> }),
    });

    const trigger = await screen.findByRole('button', { name: 'Space: Control center' });

    expect(trigger).toHaveTextContent('CC');
  });

  it('follows the current value when it loads late or changes', async () => {
    let current: MainNavMenuCurrent | null = null;
    const listeners = new Set<() => void>();
    const subscribe = (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    };

    renderMenus({ useCurrent: () => React.useSyncExternalStore(subscribe, () => current) });

    expect(await screen.findByRole('button', { name: 'Space' })).toBeInTheDocument();

    act(() => {
      current = { label: 'France' };
      listeners.forEach((listener) => listener());
    });

    expect(await screen.findByRole('button', { name: 'Space: France' })).toBeInTheDocument();
  });

  it('shows the name in a tooltip, and not when it is shown next to the icon', async () => {
    const { user, unmount } = renderMenus();

    await user.hover(await screen.findByRole('button', { name: 'Space' }));
    expect((await screen.findAllByRole('tooltip'))[0]).toHaveTextContent('Space');

    unmount();

    const { user: mobileUser } = renderMenus({}, { showLabel: true });

    await mobileUser.hover(await screen.findByRole('button', { name: 'Space' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('opens the plugin items and closes once one is selected', async () => {
    const { user } = renderMenus();

    await user.click(await screen.findByRole('button', { name: 'Space' }));
    await user.click(screen.getByRole('menuitem', { name: 'France' }));

    expect(onSelect).toHaveBeenCalledWith('france');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const { user } = renderMenus();

    await user.click(await screen.findByRole('button', { name: 'Space' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('[Escape]');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('hides a menu from users without its permissions, without running its useCurrent', async () => {
    const useNotHeldCurrent = jest.fn(() => null);
    const mainNav = new MainNav();
    const spaces = {
      icon: Earth,
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

    expect(await screen.findByRole('button', { name: 'Space' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Other' })).not.toBeInTheDocument();
    // Nor while the permissions were loading
    expect(useNotHeldCurrent).not.toHaveBeenCalled();
  });
});
