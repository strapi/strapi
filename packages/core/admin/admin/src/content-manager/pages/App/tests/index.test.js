/* eslint-disable no-irregular-whitespace */
import React from 'react';
import { createStore, combineReducers } from 'redux';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { Provider } from 'react-redux';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { render, screen } from '@testing-library/react';
import Theme from '../../../../components/Theme';
import ContentManagerApp from '..';
import cmReducers from '../../../../reducers';
import useModels from '../useModels';

jest.mock('../useModels', () =>
  jest.fn(() => {
    return {};
  })
);

jest.mock('react-intl', () => ({
  FormattedMessage: () => 'label',
  useIntl: () => ({ formatMessage: jest.fn(() => 'label') }),
}));
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => null,
}));

jest.mock('../../NoContentType', () => () => <div>NoContentType</div>);

describe('Content manager | App | main', () => {
  beforeEach(() => {
    jest.resetModules(); // Most important - it clears the cache
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should not crash', () => {
    const contentManagerState = {
      collectionTypeLinks: [
        {
          uid: 'category',
          title: 'Categories',
          name: 'category',
          to: '/content-manager/collectionType/category',
          kind: 'collectionType',
          isDisplayed: true,
          permissions: [
            {
              action: 'plugins::content-manager.explorer.read',
              subject: 'category',
            },
          ],
        },
      ],
      singleTypeLinks: [
        {
          uid: 'homepage',
          title: 'Home page',
          name: 'homepage',
          to: '/homepage',
          kind: 'singleType',
          isDisplayed: true,
          permissions: [
            {
              action: 'plugins::content-manager.explorer.read',
              subject: 'homepage',
            },
          ],
        },
      ],
      models: [
        {
          kind: 'collectionType',
          uid: 'category',
          info: { label: 'Categories', name: 'category' },
        },
        { kind: 'singleType', uid: 'homepage', info: { label: 'Home page', name: 'homepage' } },
      ],
      components: [],
      status: 'resolved',
    };
    useModels.mockImplementation(() => contentManagerState);
    const rootReducer = combineReducers(cmReducers);
    const store = createStore(rootReducer, { 'content-manager_app': contentManagerState });
    const history = createMemoryHistory();
    history.push('/content-manager');

    const { container } = render(
      <Theme>
        <DndProvider backend={HTML5Backend}>
          <Provider store={store}>
            <Router history={history}>
              <ContentManagerApp />
            </Router>
          </Provider>
        </DndProvider>
      </Theme>
    );

    expect(screen.getByText('Home page')).toBeVisible();
    expect(screen.getByText('Categories')).toBeVisible();
    expect(history.location.pathname).toEqual('/content-manager/collectionType/category');
    expect(container.firstChild).toMatchInlineSnapshot(`
      .c4 {
        border: 0;
        -webkit-clip: rect(0 0 0 0);
        clip: rect(0 0 0 0);
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        width: 1px;
      }

      .c5 {
        -webkit-animation: gzYjWD 1s infinite linear;
        animation: gzYjWD 1s infinite linear;
      }

      .c3 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-box-pack: space-around;
        -webkit-justify-content: space-around;
        -ms-flex-pack: space-around;
        justify-content: space-around;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c2 {
        margin-bottom: 0;
        padding-left: 0;
        max-height: 182px;
        overflow-y: auto;
      }

      .c2::-webkit-scrollbar {
        background: transparent;
      }

      .c2::-webkit-scrollbar-track {
        background: transparent;
      }

      .c2::-webkit-scrollbar-track:hover {
        background: transparent;
      }

      .c2 li {
        position: relative;
        margin-bottom: 2px;
      }

      .c2 a {
        display: block;
        padding-left: 30px;
        height: 34px;
        border-radius: 2px;
      }

      .c2 a p {
        color: #2D3138;
        font-size: 13px;
        line-height: 34px;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
        margin-bottom: 0;
      }

      .c2 a.active {
        background-color: #e9eaeb;
      }

      .c2 a.active p {
        font-weight: 600;
      }

      .c2 a.active svg {
        color: #2D3138;
      }

      .c2 a:hover {
        -webkit-text-decoration: none;
        text-decoration: none;
      }

      .c1 {
        margin-bottom: 24px;
      }

      .c1 button {
        outline: 0;
      }

      .c1 .count-info {
        position: relative;
        display: inline-block;
        height: 14px;
        min-width: 14px;
        margin-top: 2px;
        padding: 1px 3px;
        text-align: center;
        border-radius: 2px;
      }

      .c1 .count-info:before {
        content: attr(datadescr);
        position: absolute;
        top: 1px;
        height: 14px;
        min-width: 14px;
        padding: 0px 3px;
        background-color: #E9EAEB;
        border-radius: 2px;
      }

      .c1 .list-header {
        color: #919bae;
      }

      .c1 .list-header > div {
        position: relative;
      }

      .c1 .list-header h3 {
        margin-bottom: 10px;
        padding-right: 20px;
        padding-top: 2px;
        font-family: Lato;
        font-size: 1.1rem;
        line-height: normal;
        -webkit-letter-spacing: 0.1rem;
        -moz-letter-spacing: 0.1rem;
        -ms-letter-spacing: 0.1rem;
        letter-spacing: 0.1rem;
        font-weight: bold;
        text-transform: uppercase;
      }

      .c1 .list-header h3 + button {
        position: absolute;
        top: 2px;
        right: 0;
        padding: 2px 0 0px 5px;
        line-height: 11px;
      }

      .c1 .list-header h3 + button i,
      .c1 .list-header h3 + button svg {
        font-size: 11px;
      }

      .c1 .list-header .search-wrapper {
        margin-bottom: 7px;
      }

      .c1 .list-header .search-wrapper::after {
        display: block;
        content: '';
        height: 2px;
        width: calc(100% - 20px);
        background: #E9EAEB;
      }

      .c1 .list-header .search-wrapper > svg {
        position: absolute;
        bottom: 6px;
        left: 0;
        font-size: 11px;
      }

      .c1 .list-header .search-wrapper button {
        position: absolute;
        top: 0;
        right: 0;
        padding: 5px 0 0px 5px;
        line-height: 11px;
      }

      .c1 .list-header .search-wrapper button i,
      .c1 .list-header .search-wrapper button svg {
        font-size: 11px;
      }

      .c1 ul {
        list-style: none;
        padding-top: 2px;
      }

      .c1 ul li a {
        text-transform: capitalize;
      }

      .c0 {
        width: 100%;
        min-height: calc(100vh - 6rem);
        background-color: #f2f3f4;
        padding-top: 3.1rem;
        padding-left: 2rem;
        padding-right: 2rem;
      }

      <div
        class="container-fluid"
      >
        <div
          class="row"
        >
          <div
            class="c0 col-md-3"
          >
            <div
              class="c1"
            >
              <div
                class="list-header"
              >
                <div
                  class="title-wrapper"
                >
                  <h3>
                    label
                      
                    <span
                      class="count-info"
                      datadescr="1"
                    >
                      1
                    </span>
                  </h3>
                  <button />
                </div>
              </div>
              <div>
                <ul
                  class="c2"
                >
                  <li>
                    <a
                      aria-current="page"
                      class="active"
                      href="/content-manager/collectionType/category"
                    >
                      <p>
                        Categories
                      </p>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div
              class="c1"
            >
              <div
                class="list-header"
              >
                <div
                  class="title-wrapper"
                >
                  <h3>
                    label
                      
                    <span
                      class="count-info"
                      datadescr="1"
                    >
                      1
                    </span>
                  </h3>
                  <button />
                </div>
              </div>
              <div>
                <ul
                  class="c2"
                >
                  <li>
                    <a
                      href="/homepage"
                    >
                      <p>
                        Home page
                      </p>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div
            class="col-md-9"
            style="padding: 0px;"
          >
            <div
              class="c3"
              data-testid="loader"
            >
              <div
                aria-live="assertive"
                role="alert"
              >
                <div
                  class="c4"
                >
                  Loading content.
                </div>
                <img
                  aria-hidden="true"
                  class="c5"
                  src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjMiIGhlaWdodD0iNjMiIHZpZXdCb3g9IjAgMCA2MyA2MyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQyLjU1NjMgMTEuOTgxNkMzOS40ODQgMTAuMzA3MSAzNS44NTc1IDkuMjkwOTcgMzIuMzM1NCA5LjEzNTIxQzI4LjY0NDMgOC45Mjg4OCAyNC44Mjk1IDkuNzIzMTggMjEuMzMzNiAxMS40MTI5QzIwLjkxMjMgMTEuNTkwMSAyMC41Mzc2IDExLjgxMDEgMjAuMTcyMiAxMi4wMjQ5TDIwLjAxMDggMTIuMTE3OUMxOS44Nzc0IDEyLjE5NTEgMTkuNzQ0MSAxMi4yNzI0IDE5LjYwOCAxMi4zNTM2QzE5LjMyNTMgMTIuNTE0NiAxOS4wNDkyIDEyLjY3NDQgMTguNzU0NCAxMi44NzkyQzE4LjU0NjMgMTMuMDMyOSAxOC4zMzk1IDEzLjE3NTkgMTguMTMwMSAxMy4zMjNDMTcuNTY1OCAxMy43MjA4IDE2Ljk4NjggMTQuMTMxNyAxNi40OTgzIDE0LjU5NzlDMTQuODQ3NiAxNS45NTI0IDEzLjU1NzEgMTcuNjA3NSAxMi42MDcxIDE4LjkyMTRDMTAuNDM2NSAyMi4xNTY2IDkuMDg2MjIgMjUuOTU2NyA4LjgwNzAyIDI5LjYxNDNMOC43NzY0IDMwLjE1ODhDOC43MzMyOCAzMC45MTk2IDguNjg0NzYgMzEuNzA1NyA4Ljc1MzUzIDMyLjQ1NTVDOC43NjY0OCAzMi42MDg0IDguNzY2MSAzMi43NjM4IDguNzc1MDYgMzIuOTE0QzguNzg4OTUgMzMuMjI5IDguODAxNTIgMzMuNTM3MyA4Ljg0NiAzMy44NjcyTDkuMDczOTYgMzUuNDIyMUM5LjA5NzU2IDM1LjU3NjQgOS4xMTk4IDM1Ljc0MTMgOS4xNjMzIDM1LjkyNjNMOS42NTkxOSAzNy45MjcyTDEwLjEzOCAzOS4yODIzQzEwLjI3MjkgMzkuNjY3MyAxMC40MTU4IDQwLjA3NTEgMTAuNiA0MC40M0MxMi4wMjkyIDQzLjYzNyAxNC4xNDI1IDQ2LjQ1NzggMTYuNzA2MyA0OC41ODVDMTkuMDUwOCA1MC41Mjk2IDIxLjgyNCA1Mi4wMDIzIDI0Ljc0OTEgNTIuODQ1MkwyNi4yMzcxIDUzLjIzNzZDMjYuMzc4MSA1My4yNjkzIDI2LjQ5MjYgNTMuMjg4OSAyNi42MDMxIDUzLjMwNThMMjYuNzc3NSA1My4zMzExQzI3LjAwNTIgNTMuMzYzNiAyNy4yMTk1IDUzLjM5ODYgMjcuNDQ0NSA1My40MzVDMjcuODU5OCA1My41MDc2IDI4LjI2NzIgNTMuNTc0OCAyOC43MDc5IDUzLjYxODNMMzAuNTY0MSA1My43MjI5QzMwLjk1MTYgNTMuNzI0OSAzMS4zMzUyIDUzLjcwNjggMzEuNzA4MSA1My42ODc0QzMxLjkwMzkgNTMuNjgxIDMyLjA5ODQgNTMuNjY4MSAzMi4zMjg4IDUzLjY2MkMzNC41MjUzIDUzLjQ3NzIgMzYuNTEwNiA1My4wNjM0IDM4LjA1MTYgNTIuNDY1MkMzOC4xNzY5IDUyLjQxNzEgMzguMzAwOCA1Mi4zNzk2IDM4LjQyMzQgNTIuMzM1NUMzOC42NzI3IDUyLjI0OTkgMzguOTI1OSA1Mi4xNjcgMzkuMTQzMiA1Mi4wNTk5TDQwLjg1OTEgNTEuMjYyNkw0Mi41NzAyIDUwLjI2NkM0Mi45MDA5IDUwLjA2ODIgNDMuMDIwNSA0OS42NDE0IDQyLjgyODIgNDkuMjk4NEM0Mi42MzIgNDguOTUyNiA0Mi4yMDM0IDQ4LjgzMDggNDEuODYzNCA0OS4wMTY2TDQwLjE3OTIgNDkuOTIxOEwzOC40OTk1IDUwLjYyMjRDMzguMzE2OSA1MC42OTUzIDM4LjEyMSA1MC43NTM0IDM3LjkyMjQgNTAuODE1NUMzNy43ODM4IDUwLjg0ODkgMzcuNjUxOCA1MC44OTgzIDM3LjUwMTIgNTAuOTQwOEMzNi4wNzExIDUxLjQzNSAzNC4yNDQ1IDUxLjc0MjUgMzIuMjQ0IDUxLjgzNDZDMzIuMDQ0MiA1MS44MzgzIDMxLjg0NzEgNTEuODM3OSAzMS42NTQgNTEuODQwM0MzMS4zMDUxIDUxLjg0MTQgMzAuOTYwMiA1MS44NDUxIDMwLjYzOTIgNTEuODMwNUwyOC45MTc3IDUxLjY3MjVDMjguNTQ3NiA1MS42MTkgMjguMTY5NSA1MS41NDI3IDI3Ljc4NDggNTEuNDY3OEMyNy41NjM5IDUxLjQxNjcgMjcuMzM3NiA1MS4zNzM3IDI3LjEyOTkgNTEuMzM3NEwyNi45NTI5IDUxLjI5ODdDMjYuODcwNCA1MS4yODM0IDI2Ljc3NzIgNTEuMjY2NyAyNi43MzMzIDUxLjI1NDNMMjUuMzQ2NiA1MC44MzIyQzIyLjc2NTEgNDkuOTc4OSAyMC4zMyA0OC41NzI5IDE4LjI5NDIgNDYuNzU1N0MxNi4xMDU2IDQ0Ljc5NTEgMTQuMzMzOSA0Mi4yMzM1IDEzLjE3NDIgMzkuMzU4MkMxMi4wMjc2IDM2LjYwMTMgMTEuNTk4OCAzMy4yNzkyIDExLjk3MTYgMzAuMDA3NkMxMi4zMTQ1IDI3LjAyMTMgMTMuMzk0OCAyNC4xNjM1IDE1LjE4NTggMjEuNTA4M0MxNS4zMDM0IDIxLjMzMzkgMTUuNDIxIDIxLjE1OTYgMTUuNTIxMiAyMS4wMTk2QzE2LjQzMDkgMTkuODY4OCAxNy41NDA4IDE4LjU1ODkgMTguOTQ4MyAxNy40OTZDMTkuMzM2NyAxNy4xNTI1IDE5Ljc4NjIgMTYuODU2IDIwLjI2MTEgMTYuNTQ3OEMyMC40ODc4IDE2LjQwMDkgMjAuNzA3OSAxNi4yNTUzIDIwLjg5MDcgMTYuMTMwNkMyMS4wOTc0IDE2LjAwNDggMjEuMzE4OCAxNS44ODMxIDIxLjUzNDggMTUuNzY5NEMyMS42NzYxIDE1LjY5NzUgMjEuODE2MiAxNS42MTkgMjEuOTM4OCAxNS41NTc2TDIyLjEwMDIgMTUuNDY0NkMyMi40MDAyIDE1LjMwMzcgMjIuNjc0OSAxNS4xNTQ2IDIyLjk5MDggMTUuMDM5TDI0LjExODYgMTQuNTcxNUMyNC4zMzk5IDE0LjQ4NDQgMjQuNTcxOCAxNC40MTU5IDI0Ljc5OTcgMTQuMzQ0N0MyNC45NTMgMTQuMjk4MiAyNS4wOTgyIDE0LjI2MzUgMjUuMjYzNSAxNC4yMDc4QzI1Ljc4NiAxNC4wMTgyIDI2LjMyODMgMTMuOTExMiAyNi45MTA1IDEzLjc5NjVDMjcuMTE3IDEzLjc1NzEgMjcuMzMwMiAxMy43MTYzIDI3LjU2MDggMTMuNjU4NUMyNy43NTUzIDEzLjYxMSAyNy45NzM3IDEzLjU5NjkgMjguMjA4MiAxMy41NzYyQzI4LjM2NCAxMy41NjAzIDI4LjUxNzIgMTMuNTQ4MyAyOC42MzE4IDEzLjUzMzNDMjguNzg3NiAxMy41MTczIDI4LjkzNDIgMTMuNTA2NiAyOS4wOTI3IDEzLjQ4NjdDMjkuMzI4NSAxMy40NTU1IDI5LjU0NTYgMTMuNDM0NyAyOS43NDk0IDEzLjQzMzdDMzAuMDIzNyAxMy40NCAzMC4yOTk0IDEzLjQzNTcgMzAuNTc3NyAxMy40Mjc0QzMxLjA4MTEgMTMuNDIxIDMxLjU1NzkgMTMuNDE5NyAzMi4wMzE4IDEzLjQ5MTRDMzQuOTY2NCAxMy43MzUyIDM3LjcxNDQgMTQuNjA4NSA0MC4yMDUyIDE2LjA4NjhDNDIuMzQ4OSAxNy4zNjU1IDQ0LjI3MTYgMTkuMTUyNSA0NS43NjA3IDIxLjI2NEM0Ny4wMjU1IDIzLjA2MjggNDcuOTc1NiAyNS4wNTI4IDQ4LjQ5MjggMjcuMDM5M0M0OC41NzIgMjcuMzE3NiA0OC42Mjk5IDI3LjU5MzEgNDguNjgzOSAyNy44NjU5QzQ4LjcxNTQgMjguMDQyOCA0OC43NTYzIDI4LjIxNDUgNDguNzg5MiAyOC4zNjM2QzQ4LjgwMzcgMjguNDU0MSA0OC44MjA4IDI4LjU0MDYgNDguODQ0NSAyOC42MjU4QzQ4Ljg3NDkgMjguNzQ0MyA0OC44OTg2IDI4Ljg2NCA0OC45MTE2IDI4Ljk2NTFMNDguOTc5MyAyOS42MDQ3QzQ4Ljk5MjIgMjkuNzc0OCA0OS4wMTMyIDI5LjkzMzEgNDkuMDMwMSAzMC4wODg3QzQ5LjA2NjggMzAuMzI2OCA0OS4wODg5IDMwLjU2MDggNDkuMDk2NCAzMC43NTYxTDQ5LjEwODMgMzEuOTAwMUM0OS4xMzEyIDMyLjMzMDcgNDkuMDg5IDMyLjcxMTYgNDkuMDUyMiAzMy4wNjczQzQ5LjAzODQgMzMuMjU5OCA0OS4wMTI2IDMzLjQ0NDMgNDkuMDEyMyAzMy41ODI0QzQ4Ljk5NjEgMzMuNjkyNiA0OC45OTE4IDMzLjc5MzUgNDguOTgzNiAzMy44OTE3QzQ4Ljk3NTMgMzQuMDA3MiA0OC45NzI0IDM0LjExNDggNDguOTQxNCAzNC4yNTU0TDQ4LjU0NDkgMzYuMzA1OUM0OC4zMTM0IDM3Ljg2MjMgNDkuMzc5MyAzOS4zMzY1IDUwLjk0ODggMzkuNTgyMkM1Mi4wNDE3IDM5Ljc2MDEgNTMuMTUzNiAzOS4yODE5IDUzLjc3MTEgMzguMzY2NEM1NC4wMDYzIDM4LjAxNzYgNTQuMTYwNCAzNy42MjU3IDU0LjIyMjcgMzcuMjA2NEw1NC41MjE3IDM1LjI1NzRDNTQuNTUxNCAzNS4wNzU2IDU0LjU3MiAzNC44MyA1NC41ODQ2IDM0LjU3OTFMNTQuNjAyOCAzNC4yMzM4QzU0LjYwOTggMzQuMDU5OCA1NC42MjIzIDMzLjg3NzkgNTQuNjM0NyAzMy42Nzg4QzU0LjY3MzQgMzMuMTA1MiA1NC43MTYzIDMyLjQ0NzkgNTQuNjYxOSAzMS44MDU4TDU0LjU4NjcgMzAuNDI4OUM1NC41NjIyIDMwLjA5NTIgNTQuNTA5NyAyOS43NiA1NC40NTU5IDI5LjQxODFDNTQuNDMxIDI5LjI1NzIgNTQuNDA0OCAyOS4wODk2IDU0LjM4MjYgMjguOTA3NEw1NC4yNjg3IDI4LjEwNEM1NC4yMzMyIDI3LjkyNDQgNTQuMTgwNCAyNy43MjczIDU0LjEzMjkgMjcuNTM5Nkw1NC4wNjQzIDI3LjI0NTRDNTQuMDE5NSAyNy4wNzEgNTMuOTc3MyAyNi44OTI3IDUzLjkzMzggMjYuNzA3NkM1My44NDU1IDI2LjMzMDkgNTMuNzQ3OSAyNS45NDIyIDUzLjYxMyAyNS41NTcxQzUyLjg0IDIzLjAyOTIgNTEuNTM4MyAyMC41MTk0IDQ5LjgzMzggMTguMjc5OUM0Ny44NTQ0IDE1LjY4MiA0NS4zMzMzIDEzLjUwODcgNDIuNTU2MyAxMS45ODE2WiIgZmlsbD0iIzQ5NDVGRiIvPgo8L3N2Zz4K"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
  });

  it('should redirect to the single type', () => {
    const contentManagerState = {
      collectionTypeLinks: [],
      singleTypeLinks: [
        {
          uid: 'homepage',
          title: 'Home page',
          name: 'homepage',
          to: '/content-manager/homepage',
          kind: 'singleType',
          isDisplayed: true,
          permissions: [
            {
              action: 'plugins::content-manager.explorer.read',
              subject: 'homepage',
            },
          ],
        },
      ],
      models: [
        {
          kind: 'collectionType',
          uid: 'category',
          info: { label: 'Categories', name: 'category' },
        },
        { kind: 'singleType', uid: 'homepage', info: { label: 'Home page', name: 'homepage' } },
      ],
      components: [],
      status: 'resolved',
    };
    useModels.mockImplementation(() => contentManagerState);
    const rootReducer = combineReducers(cmReducers);
    const store = createStore(rootReducer, { 'content-manager_app': contentManagerState });
    const history = createMemoryHistory();
    history.push('/content-manager');

    render(
      <Theme>
        <DndProvider backend={HTML5Backend}>
          <Provider store={store}>
            <Router history={history}>
              <ContentManagerApp />
            </Router>
          </Provider>
        </DndProvider>
      </Theme>
    );

    expect(history.location.pathname).toEqual('/content-manager/homepage');
  });

  it('should redirect to 403 page', () => {
    const history = createMemoryHistory();
    const contentManagerState = {
      collectionTypeLinks: [],
      singleTypeLinks: [],
      models: [
        {
          kind: 'collectionType',
          uid: 'category',
          info: { label: 'Categories', name: 'category' },
        },
        { kind: 'singleType', uid: 'homepage', info: { label: 'Home page', name: 'homepage' } },
      ],
      components: [],
      status: 'resolved',
    };
    useModels.mockImplementation(() => contentManagerState);
    jest.mock('../useModels', () =>
      jest.fn(() => {
        return contentManagerState;
      })
    );
    const rootReducer = combineReducers(cmReducers);
    const store = createStore(rootReducer, { 'content-manager_app': contentManagerState });
    history.push('/content-manager/collectionType/category');

    render(
      <Theme>
        <DndProvider backend={HTML5Backend}>
          <Provider store={store}>
            <Router history={history}>
              <ContentManagerApp />
            </Router>
          </Provider>
        </DndProvider>
      </Theme>
    );

    expect(history.location.pathname).toEqual('/content-manager/403');
  });

  it('should redirect to the no-content-types page', () => {
    const history = createMemoryHistory();
    const contentManagerState = {
      collectionTypeLinks: [],
      singleTypeLinks: [],
      models: [],
      components: [],
      status: 'resolved',
    };
    useModels.mockImplementation(() => contentManagerState);
    jest.mock('../useModels', () =>
      jest.fn(() => {
        return contentManagerState;
      })
    );
    const rootReducer = combineReducers(cmReducers);
    const store = createStore(rootReducer, { 'content-manager_app': contentManagerState });
    history.push('/content-manager/collectionType/category');

    render(
      <Theme>
        <DndProvider backend={HTML5Backend}>
          <Provider store={store}>
            <Router history={history}>
              <ContentManagerApp />
            </Router>
          </Provider>
        </DndProvider>
      </Theme>
    );

    expect(history.location.pathname).toEqual('/content-manager/no-content-types');
  });
});
