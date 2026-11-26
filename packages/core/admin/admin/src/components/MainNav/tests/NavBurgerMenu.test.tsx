import { Menu } from '@strapi/design-system';
import { Earth } from '@strapi/icons';
import { render, screen } from '@tests/utils';

import { MainNav } from '../../../core/apis/MainNav';
import { NavBurgerMenu } from '../NavBurgerMenu';

describe('NavBurgerMenu', () => {
  it('shows plugin menus with their name, right before the profile menu', async () => {
    const mainNav = new MainNav();
    mainNav.addMenu({
      id: 'spaces',
      useCurrent: () => ({ label: 'Control center', icon: <Earth /> }),
      intlLabel: { id: 'spaces.switcher.label', defaultMessage: 'Space' },
      Content: () => <Menu.Item>France</Menu.Item>,
    });

    render(
      <NavBurgerMenu isShown listLinks={[]} handleClickOnLink={jest.fn()} onClose={jest.fn()} />,
      { providerOptions: { mainNav } }
    );

    const spaces = await screen.findByRole('button', { name: 'Space: Control center' });
    const menuTriggers = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-haspopup') === 'menu');

    expect(menuTriggers).toHaveLength(2);
    expect(menuTriggers[0]).toBe(spaces);
  });
});
