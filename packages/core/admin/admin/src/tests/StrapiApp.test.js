import { render } from '@testing-library/react';
import { fixtures } from '../../../../../admin-test-utils';
import { Components, Fields } from '../core/apis';
import StrapiApp from '../StrapiApp';
import appReducers from '../reducers';

const library = { fields: Fields(), components: Components() };
const middlewares = { middlewares: [] };
const reducers = { reducers: appReducers };

describe('ADMIN | StrapiApp', () => {
  it('should render the app without plugins', () => {
    const app = StrapiApp({ middlewares, reducers, library });
    const { container } = render(app.render());

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c0 {
        margin-left: -250px;
        position: fixed;
        left: 50%;
        top: 2.875rem;
        z-index: 10;
        width: 31.25rem;
      }

      .c1 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c1 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c1 > * + * {
        margin-top: 8px;
      }

      <div
        class="c0 c1"
        width="31.25rem"
      />
    `);
  });

  it('should create a valid store', () => {
    const app = StrapiApp({ middlewares, reducers, library });

    const store = app.createStore();

    expect(store.getState()).toEqual(fixtures.store.state);
  });

  describe('Hook api', () => {
    it('runs the "moto" hooks in series', () => {
      const app = StrapiApp({ middlewares, reducers, library });

      app.createHook('hello');
      app.createHook('moto');

      app.registerHook('hello', () => 5);
      app.registerHook('moto', () => 1);
      app.registerHook('moto', () => 2);
      app.registerHook('moto', () => 3);

      const [a, b, c] = app.runHookSeries('moto');

      expect(a).toBe(1);
      expect(b).toBe(2);
      expect(c).toBe(3);
    });

    it('runs the "moto" hooks in series asynchronously', async () => {
      const app = StrapiApp({ middlewares, reducers, library });

      app.createHook('hello');
      app.createHook('moto');

      app.registerHook('hello', () => Promise.resolve(5));
      app.registerHook('moto', () => 1);
      app.registerHook('moto', () => 2);
      app.registerHook('moto', () => 3);

      const [a, b, c] = await app.runHookSeries('moto', true);

      expect(a).toBe(1);
      expect(b).toBe(2);
      expect(c).toBe(3);
    });

    it('runs the "moto" hooks in waterfall', () => {
      const app = StrapiApp({ middlewares, reducers, library });

      app.createHook('hello');
      app.createHook('moto');

      app.registerHook('hello', () => 5);
      app.registerHook('moto', n => n + 1);
      app.registerHook('moto', n => n + 2);
      app.registerHook('moto', n => n + 3);

      const res = app.runHookWaterfall('moto', 1);

      expect(res).toBe(7);
    });

    it('runs the "moto" hooks in waterfall asynchronously', async () => {
      const app = StrapiApp({ middlewares, reducers, library });

      app.createHook('hello');
      app.createHook('moto');

      app.registerHook('hello', () => 5);
      app.registerHook('moto', n => n + 1);
      app.registerHook('moto', n => Promise.resolve(n + 2));
      app.registerHook('moto', n => n + 3);

      const res = await app.runHookWaterfall('moto', 1, true);

      expect(res).toBe(7);
    });

    it('runs the "moto" hooks in parallel', async () => {
      const app = StrapiApp({ middlewares, reducers, library });

      app.createHook('hello');
      app.createHook('moto');

      app.registerHook('hello', () => 5);
      app.registerHook('moto', () => 1);
      app.registerHook('moto', () => 2);
      app.registerHook('moto', () => 3);

      const [a, b, c] = await app.runHookParallel('moto');

      expect(a).toBe(1);
      expect(b).toBe(2);
      expect(c).toBe(3);
    });
  });

  describe('Settings api', () => {
    it('the settings should be defined', () => {
      const app = StrapiApp({ middlewares, reducers, library });

      expect(app.settings).toBeDefined();
      expect(app.settings.global).toBeDefined();
    });

    it('should creates a new section', () => {
      const app = StrapiApp({ middlewares, reducers, library });
      const section = { id: 'foo', intlLabel: { id: 'foo', defaultMessage: 'foo' } };
      const links = [
        {
          Component: jest.fn(),
          to: '/bar',
          id: 'bar',
          intlLabel: { id: 'bar', defaultMessage: 'bar' },
        },
      ];
      app.createSettingSection(section, links);

      expect(app.settings.foo).toBeDefined();
      expect(app.settings.foo.links).toEqual(links);
    });

    it('should add a link correctly to the global section', () => {
      const app = StrapiApp({ middlewares, reducers, library });
      const link = {
        Component: jest.fn(),
        to: '/bar',
        id: 'bar',
        intlLabel: { id: 'bar', defaultMessage: 'bar' },
      };

      app.addSettingsLink('global', link);

      expect(app.settings.global.links).toHaveLength(1);
      expect(app.settings.global.links[0]).toEqual(link);
    });

    it('should add an array of links correctly to the global section', () => {
      const app = StrapiApp({ middlewares, reducers, library });
      const links = [
        {
          Component: jest.fn(),
          to: '/bar',
          id: 'bar',
          intlLabel: { id: 'bar', defaultMessage: 'bar' },
        },
      ];

      app.addSettingsLinks('global', links);

      expect(app.settings.global.links).toHaveLength(1);
      expect(app.settings.global.links).toEqual(links);
    });
  });

  describe('Menu api', () => {
    it('the menu should be defined', () => {
      const app = StrapiApp({ middlewares, reducers, library });

      expect(app.menu).toBeDefined();
      expect(Array.isArray(app.menu)).toBe(true);
    });

    it('addMenuLink should add a link to the menu', () => {
      const app = StrapiApp({ middlewares, reducers, library });
      const link = {
        Component: jest.fn(),
        to: '/plugins/bar',
        intlLabel: { id: 'bar', defaultMessage: 'bar' },
        permissions: [],
        icon: () => 'book',
      };

      app.addMenuLink(link);

      expect(app.menu[0]).toBeDefined();
      expect(app.menu[0]).toEqual(link);
    });

    it('addCorePluginMenuLink should add a link to the menu', () => {
      const app = StrapiApp({ middlewares, reducers, library });
      const link = {
        to: '/plugins/content-type-builder',
        icon: () => 'book',
        permissions: [],
        intlLabel: {
          id: 'content-type-builder.plugin.name',
          defaultMessage: 'Content Type builder',
        },
      };

      app.addCorePluginMenuLink(link);

      expect(app.menu).toHaveLength(1);
      expect(app.menu[0]).toEqual(link);
    });
  });

  describe('createCustomConfigurations', () => {
    it('should add a locale', () => {
      const adminConfig = {
        config: { locales: ['fr'] },
      };
      const app = StrapiApp({ middlewares, reducers, library, adminConfig });

      app.createCustomConfigurations();

      expect(app.configurations.locales).toEqual(['en', 'fr']);
    });

    it('should override the authLogo', () => {
      const adminConfig = {
        config: { auth: { logo: 'fr' } },
      };
      const app = StrapiApp({ middlewares, reducers, library, adminConfig });

      app.createCustomConfigurations();

      expect(app.configurations.authLogo).toBe('fr');
    });

    it('should override the menuLogo', () => {
      const adminConfig = {
        config: { menu: { logo: 'fr' } },
      };
      const app = StrapiApp({ middlewares, reducers, library, adminConfig });

      app.createCustomConfigurations();

      expect(app.configurations.menuLogo).toBe('fr');
    });

    it('should override the favicon', () => {
      const adminConfig = {
        config: { head: { favicon: 'fr' } },
      };
      const app = StrapiApp({ middlewares, reducers, library, adminConfig });

      app.createCustomConfigurations();

      expect(app.configurations.head.favicon).toBe('fr');
    });

    it('should override the theme', () => {
      const adminConfig = {
        config: { theme: { main: { colors: { red: 'black' } } } },
      };
      const app = StrapiApp({ middlewares, reducers, library, adminConfig });

      app.createCustomConfigurations();

      expect(app.configurations.theme.main.colors.red).toBe('black');
    });

    it('should override the tutorials', () => {
      const adminConfig = {
        config: { tutorials: false },
      };
      const app = StrapiApp({ middlewares, reducers, library, adminConfig });

      app.createCustomConfigurations();

      expect(app.configurations.tutorials).toBeFalsy();
    });

    it('should override the release notification', () => {
      const adminConfig = {
        config: { notifications: { releases: false } },
      };
      const app = StrapiApp({ middlewares, reducers, library, adminConfig });

      app.createCustomConfigurations();

      expect(app.configurations.notifications.releases).toBeFalsy();
    });
  });
});
