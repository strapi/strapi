import { render } from '@testing-library/react';
import { fixtures } from '../../../../../admin-test-utils';
import StrapiApp from '../StrapiApp';
import appReducers from '../reducers';

const library = { fields: {}, components: {} };
const middlewares = { middlewares: [] };
const reducers = { reducers: appReducers };

describe('ADMIN | StrapiApp', () => {
  it('should render the app without plugins', () => {
    const app = StrapiApp({ middlewares, reducers, library });
    const { container } = render(app.render());

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
        position: fixed;
        top: 72px;
        left: 0;
        right: 0;
        z-index: 1100;
        list-style: none;
        width: 100%;
        overflow-y: hidden;
        pointer-events: none;
      }

      <div
        class="c0"
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
});
