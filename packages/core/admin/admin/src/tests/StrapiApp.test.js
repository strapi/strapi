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
});
