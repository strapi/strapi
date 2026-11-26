import { MainNav, type MainNavMenuArgs } from '../MainNav';

const menu = (args: Partial<MainNavMenuArgs> = {}): MainNavMenuArgs => ({
  id: 'spaces',
  useCurrent: () => null,
  intlLabel: { id: 'spaces.switcher.label', defaultMessage: 'Space' },
  Content: () => null,
  ...args,
});

describe('MainNav', () => {
  test('adds menus in the order plugins add them', () => {
    const mainNav = new MainNav();

    mainNav.addMenu(menu());
    mainNav.addMenu(menu({ id: 'environments' }));

    expect(mainNav.menus.map(({ id }) => id)).toEqual(['spaces', 'environments']);
  });

  test('refuses a menu without content or useCurrent, and a menu added twice', () => {
    const mainNav = new MainNav();
    mainNav.addMenu(menu());

    expect(() => mainNav.addMenu(menu({ id: 'other', Content: undefined as never }))).toThrow(
      'A Content component must be provided'
    );
    expect(() => mainNav.addMenu(menu({ id: 'other', useCurrent: undefined as never }))).toThrow(
      'A useCurrent hook must be provided'
    );
    expect(() => mainNav.addMenu(menu())).toThrow(
      'A main navigation menu with the id "spaces" has already been added'
    );
    expect(mainNav.menus).toHaveLength(1);
  });

  it('refuses menus added once the admin has rendered', () => {
    const mainNav = new MainNav();
    mainNav.lock();

    expect(() =>
      mainNav.addMenu({
        id: 'spaces',
        useCurrent: () => null,
        intlLabel: { id: 'spaces.switcher.label', defaultMessage: 'Space' },
        Content: () => null,
      })
    ).toThrow('Main navigation menus must be added in register');
  });
});
