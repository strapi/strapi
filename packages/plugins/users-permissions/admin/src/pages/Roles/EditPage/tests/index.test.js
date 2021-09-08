import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { Router, Switch, Route } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { createMemoryHistory } from 'history';

import pluginId from '../../../../pluginId';
import RolesEditPage from '..';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => jest.fn()),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn(), unlockApp: jest.fn() })),
}));

jest.mock('../../../../hooks', () => {
  const originalModule = jest.requireActual('../../../../hooks');

  return {
    ...originalModule,
    useFetchRole: id => {
      const role = {
        id,
        name: 'Authenticated',
        description: 'Default role given to authenticated user.',
        type: 'authenticated',
      };
      const onSubmitSucceed = jest.fn();

      return { role, onSubmitSucceed };
    },
    usePlugins: () => ({
      ...originalModule.usePlugins,
      isLoading: false,
    }),
  };
});

function makeAndRenderApp() {
  const history = createMemoryHistory();
  const app = (
    <IntlProvider locale="en" messages={{ en: {} }} textComponent="span">
      <ThemeProvider theme={lightTheme}>
        <Router history={history}>
          <Switch>
            <Route path={`/settings/${pluginId}/roles/:id`} component={RolesEditPage} />
          </Switch>
        </Router>
      </ThemeProvider>
    </IntlProvider>
  );
  const renderResult = render(app);
  history.push(`/settings/${pluginId}/roles/1`);

  return renderResult;
}

it('renders users-permissions edit role and matches snapshot', () => {
  const { container } = makeAndRenderApp();

  expect(container.firstChild).toMatchInlineSnapshot(`
    .c5 {
      font-weight: 600;
      font-size: 2rem;
      line-height: 1.25;
      color: #32324d;
    }

    .c10 {
      font-weight: 500;
      font-size: 0.75rem;
      line-height: 1.33;
      color: #32324d;
    }

    .c11 {
      font-weight: 400;
      font-size: 0.875rem;
      line-height: 1.43;
      color: #666687;
    }

    .c12 {
      font-size: 1rem;
      line-height: 1.5;
    }

    .c2 {
      background: #f6f6f9;
      padding-top: 56px;
      padding-right: 56px;
      padding-bottom: 56px;
      padding-left: 56px;
    }

    .c8 {
      padding-right: 8px;
    }

    .c15 {
      background: #ffffff;
      padding-top: 24px;
      padding-right: 32px;
      padding-bottom: 24px;
      padding-left: 32px;
      border-radius: 4px;
      box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
    }

    .c3 {
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      -webkit-flex-direction: row;
      -ms-flex-direction: row;
      flex-direction: row;
      -webkit-box-pack: justify;
      -webkit-justify-content: space-between;
      -ms-flex-pack: justify;
      justify-content: space-between;
      -webkit-align-items: center;
      -webkit-box-align: center;
      -ms-flex-align: center;
      align-items: center;
    }

    .c4 {
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      -webkit-flex-direction: row;
      -ms-flex-direction: row;
      flex-direction: row;
      -webkit-align-items: center;
      -webkit-box-align: center;
      -ms-flex-align: center;
      align-items: center;
    }

    .c6 {
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      background: #ffffff;
      border: 1px solid #dcdce4;
    }

    .c6 svg {
      height: 12px;
      width: 12px;
    }

    .c6 svg > g,
    .c6 svg path {
      fill: #ffffff;
    }

    .c6[aria-disabled='true'] {
      pointer-events: none;
    }

    .c7 {
      padding: 8px 16px;
      background: #4945ff;
      border: none;
      border: 1px solid #4945ff;
      background: #4945ff;
    }

    .c7 .c1 {
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      -webkit-align-items: center;
      -webkit-box-align: center;
      -ms-flex-align: center;
      align-items: center;
    }

    .c7 .c9 {
      color: #ffffff;
    }

    .c7[aria-disabled='true'] {
      border: 1px solid #dcdce4;
      background: #eaeaef;
    }

    .c7[aria-disabled='true'] .c9 {
      color: #666687;
    }

    .c7[aria-disabled='true'] svg > g,
    .c7[aria-disabled='true'] svg path {
      fill: #666687;
    }

    .c7[aria-disabled='true']:active {
      border: 1px solid #dcdce4;
      background: #eaeaef;
    }

    .c7[aria-disabled='true']:active .c9 {
      color: #666687;
    }

    .c7[aria-disabled='true']:active svg > g,
    .c7[aria-disabled='true']:active svg path {
      fill: #666687;
    }

    .c7:hover {
      border: 1px solid #7b79ff;
      background: #7b79ff;
    }

    .c7:active {
      border: 1px solid #4945ff;
      background: #4945ff;
    }

    .c14 {
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      -webkit-flex-direction: column;
      -ms-flex-direction: column;
      flex-direction: column;
    }

    .c14 > * {
      margin-top: 0;
      margin-bottom: 0;
    }

    .c14 > * + * {
      margin-top: 32px;
    }

    .c16 {
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      -webkit-flex-direction: column;
      -ms-flex-direction: column;
      flex-direction: column;
    }

    .c16 > * {
      margin-top: 0;
      margin-bottom: 0;
    }

    .c16 > * + * {
      margin-top: 16px;
    }

    .c21 {
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      -webkit-flex-direction: column;
      -ms-flex-direction: column;
      flex-direction: column;
    }

    .c21 > * {
      margin-top: 0;
      margin-bottom: 0;
    }

    .c21 > * + * {
      margin-top: 4px;
    }

    .c23 {
      border: none;
      padding-left: 16px;
      padding-right: 16px;
      color: #32324d;
      font-weight: 400;
      font-size: 0.875rem;
      display: block;
      width: 100%;
      height: 2.5rem;
    }

    .c23::-webkit-input-placeholder {
      color: #8e8ea9;
      opacity: 1;
    }

    .c23::-moz-placeholder {
      color: #8e8ea9;
      opacity: 1;
    }

    .c23:-ms-input-placeholder {
      color: #8e8ea9;
      opacity: 1;
    }

    .c23::placeholder {
      color: #8e8ea9;
      opacity: 1;
    }

    .c23:disabled {
      background: inherit;
      color: inherit;
    }

    .c23:focus {
      outline: none;
    }

    .c22 {
      border: 1px solid #dcdce4;
      border-radius: 4px;
      background: #ffffff;
      overflow: hidden;
    }

    .c22:focus-within {
      border: 1px solid #4945ff;
    }

    .c20 textarea {
      height: 5rem;
    }

    .c18 {
      display: grid;
      grid-template-columns: repeat(12,1fr);
      gap: 16px;
    }

    .c19 {
      grid-column: span 6;
      word-break: break-all;
    }

    .c0 {
      outline: none;
    }

    .c25 {
      display: block;
      width: 100%;
      border: 1px solid #dcdce4;
      border-radius: 4px;
      padding-left: 16px;
      padding-right: 16px;
      padding-top: 12px;
      padding-bottom: 12px;
      font-weight: 400;
      font-size: 0.875rem;
      color: #32324d;
      background: #ffffff;
      outline: none;
    }

    .c25:focus {
      border: 1px solid #4945ff;
    }

    .c25::-webkit-input-placeholder {
      color: #8e8ea9;
      opacity: 1;
    }

    .c25::-moz-placeholder {
      color: #8e8ea9;
      opacity: 1;
    }

    .c25:-ms-input-placeholder {
      color: #8e8ea9;
      opacity: 1;
    }

    .c25::placeholder {
      color: #8e8ea9;
      opacity: 1;
    }

    .c24 textarea {
      height: 5rem;
      line-height: 1.25rem;
      font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans', 'Helvetica Neue',sans-serif;
    }

    .c24 textarea::-webkit-input-placeholder {
      font-weight: 400;
      font-size: 0.875rem;
      line-height: 1.43;
      color: #8e8ea9;
      opacity: 1;
    }

    .c24 textarea::-moz-placeholder {
      font-weight: 400;
      font-size: 0.875rem;
      line-height: 1.43;
      color: #8e8ea9;
      opacity: 1;
    }

    .c24 textarea:-ms-input-placeholder {
      font-weight: 400;
      font-size: 0.875rem;
      line-height: 1.43;
      color: #8e8ea9;
      opacity: 1;
    }

    .c24 textarea::placeholder {
      font-weight: 400;
      font-size: 0.875rem;
      line-height: 1.43;
      color: #8e8ea9;
      opacity: 1;
    }

    .c17 {
      font-weight: 500;
      font-size: 1rem;
      line-height: 1.25;
      color: #32324d;
    }

    .c13 {
      padding-right: 56px;
      padding-left: 56px;
    }

    @media (max-width:68.75rem) {
      .c19 {
        grid-column: span;
      }
    }

    @media (max-width:34.375rem) {
      .c19 {
        grid-column: span;
      }
    }

    <main
      aria-labelledby="title"
      class="c0"
      id="main-content"
      tabindex="-1"
    >
      <div
        class="c1 "
      >
        <div
          class="c1 c2"
          data-strapi-header="true"
        >
          <div
            class="c1 c3"
          >
            <div
              class="c1 c4"
            >
              <h1
                class="c5"
                id="title"
              >
                Authenticated
              </h1>
            </div>
            <button
              aria-disabled="false"
              class="c6 c7"
              type="button"
            >
              <div
                aria-hidden="true"
                class="c1 c8"
              >
                <svg
                  fill="none"
                  height="1em"
                  viewBox="0 0 24 24"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20.727 2.97a.2.2 0 01.286 0l2.85 2.89a.2.2 0 010 .28L9.554 20.854a.2.2 0 01-.285 0l-9.13-9.243a.2.2 0 010-.281l2.85-2.892a.2.2 0 01.284 0l6.14 6.209L20.726 2.97z"
                    fill="#212134"
                  />
                </svg>
              </div>
              <span
                class="c9 c10"
              >
                Save
              </span>
            </button>
          </div>
          <p
            class="c9 c11 c12"
          >
            Default role given to authenticated user.
          </p>
        </div>
      </div>
      <form>
        <div
          class="c13"
        >
          <div
            class="c14"
          >
            <div
              class="c1 c15"
            >
              <div
                class="c16"
              >
                <h3
                  class="c17"
                >
                  Role details
                </h3>
                <div
                  class="c1 c18"
                >
                  <div
                    class="c19"
                  >
                    <div
                      class="c1 "
                    >
                      <div
                        class="c20"
                      >
                        <div>
                          <div
                            class="c21"
                          >
                            <div
                              class="c1 c4"
                            >
                              <label
                                class="c9 c10"
                                for="textinput-1"
                              >
                                Name
                              </label>
                            </div>
                            <div
                              class="c1 c3 c22"
                            >
                              <input
                                aria-invalid="false"
                                class="c23"
                                id="textinput-1"
                                name="name"
                                value="Authenticated"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    class="c19"
                  >
                    <div
                      class="c1 "
                    >
                      <div
                        class="c24"
                      >
                        <div>
                          <div
                            class="c21"
                          >
                            <div
                              class="c1 c4"
                            >
                              <label
                                class="c9 c10"
                                for="textarea-2"
                              >
                                Description
                              </label>
                            </div>
                            <textarea
                              aria-invalid="false"
                              class="c25"
                              id="textarea-2"
                              name="description"
                            >
                              Default role given to authenticated user.
                            </textarea>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </main>
  `);
});

it("can edit a users-permissions role's name and description", async () => {
  const { getByLabelText, getByRole } = makeAndRenderApp();
  const nameField = getByLabelText(/name/i);
  expect(nameField).not.toBeNull();
  const descriptionField = getByLabelText(/description/i);
  expect(descriptionField).not.toBeNull();
  const saveButton = getByRole('button', { name: /save/i });
  expect(saveButton).not.toBeNull();
});
