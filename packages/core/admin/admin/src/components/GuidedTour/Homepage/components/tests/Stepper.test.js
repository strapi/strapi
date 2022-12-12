import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import Stepper from '../Stepper';

const sections = [
  {
    key: 's1',
    title: {
      id: 's1.title',
      defaultMessage: 'title s1',
    },
    content: <div>s1 content</div>,
  },
  {
    key: 's2',
    title: {
      id: 's2.title',
      defaultMessage: 'title s2',
    },
    content: <div>s2 content</div>,
  },
  {
    key: 's3',
    title: {
      id: 's3.title',
      defaultMessage: 'title s3',
    },
    content: <div>s3 content</div>,
  },
];

const App = (children) => (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      {children}
    </IntlProvider>
  </ThemeProvider>
);

describe('GuidedTour Stepper', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(App(<Stepper sections={sections} currentSectionKey="s1" />));

    expect(firstChild).toMatchInlineSnapshot(`
      .c1 {
        margin-right: 20px;
        min-width: 1.875rem;
      }

      .c2 {
        background: #4945ff;
        padding: 8px;
        border-radius: 50%;
        width: 1.875rem;
        height: 1.875rem;
      }

      .c7 {
        margin-right: 20px;
        margin-top: 12px;
        margin-bottom: 12px;
        min-width: 1.875rem;
      }

      .c8 {
        background: #7b79ff;
        border-radius: 4px;
        width: 0.125rem;
        height: 100%;
        min-height: 5.3125rem;
      }

      .c9 {
        margin-top: 8px;
      }

      .c10 {
        padding: 8px;
        border-radius: 50%;
        border-style: solid;
        border-width: 1px;
        border-color: #8e8ea9;
        width: 1.875rem;
        height: 1.875rem;
      }

      .c12 {
        background: #c0c0cf;
        border-radius: 4px;
        width: 0.125rem;
        height: 100%;
        min-height: 4.0625rem;
      }

      .c0 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
      }

      .c3 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
      }

      .c6 {
        -webkit-align-items: flex-start;
        -webkit-box-align: flex-start;
        -ms-flex-align: flex-start;
        align-items: flex-start;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
      }

      .c4 {
        font-size: 0.875rem;
        line-height: 1.43;
        font-weight: 500;
        color: #ffffff;
      }

      .c5 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c11 {
        font-size: 0.875rem;
        line-height: 1.43;
        font-weight: 500;
        color: #666687;
      }

      <div
        class=""
      >
        <div
          class=""
        >
          <div
            class="c0"
          >
            <div
              class="c1"
            >
              <div
                class="c2 c3"
                height="1.875rem"
                width="1.875rem"
              >
                <span
                  class="c4"
                >
                  1
                </span>
              </div>
            </div>
            <h3
              class="c5"
            >
              title s1
            </h3>
          </div>
          <div
            class="c6"
          >
            <div
              class="c7 c3"
            >
              <div
                class="c8"
                height="100%"
                width="0.125rem"
              />
            </div>
            <div
              class="c9"
            >
              <div>
                s1 content
              </div>
            </div>
          </div>
        </div>
        <div
          class=""
        >
          <div
            class="c0"
          >
            <div
              class="c1"
            >
              <div
                class="c10 c3"
                height="1.875rem"
                width="1.875rem"
              >
                <span
                  class="c11"
                >
                  2
                </span>
              </div>
            </div>
            <h3
              class="c5"
            >
              title s2
            </h3>
          </div>
          <div
            class="c6"
          >
            <div
              class="c7 c3"
            >
              <div
                class="c12"
                height="100%"
                width="0.125rem"
              />
            </div>
            <div
              class="c9"
            />
          </div>
        </div>
        <div
          class=""
        >
          <div
            class="c0"
          >
            <div
              class="c1"
            >
              <div
                class="c10 c3"
                height="1.875rem"
                width="1.875rem"
              >
                <span
                  class="c11"
                >
                  3
                </span>
              </div>
            </div>
            <h3
              class="c5"
            >
              title s3
            </h3>
          </div>
          <div
            class="c6"
          >
            <div
              class="c7 c3"
            />
            <div
              class="c9"
            />
          </div>
        </div>
      </div>
    `);
  });

  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(App(<Stepper sections={sections} currentSectionKey="s2" />));

    expect(firstChild).toMatchInlineSnapshot(`
      .c1 {
        margin-right: 20px;
        min-width: 1.875rem;
      }

      .c2 {
        background: #4945ff;
        padding: 8px;
        border-radius: 50%;
        width: 1.875rem;
        height: 1.875rem;
      }

      .c4 {
        color: #ffffff;
        width: 1rem;
      }

      .c8 {
        margin-right: 20px;
        margin-top: 12px;
        margin-bottom: 12px;
        min-width: 1.875rem;
      }

      .c9 {
        background: #7b79ff;
        border-radius: 4px;
        width: 0.125rem;
        height: 100%;
        min-height: 4.0625rem;
      }

      .c10 {
        margin-top: 8px;
      }

      .c12 {
        background: #7b79ff;
        border-radius: 4px;
        width: 0.125rem;
        height: 100%;
        min-height: 5.3125rem;
      }

      .c13 {
        padding: 8px;
        border-radius: 50%;
        border-style: solid;
        border-width: 1px;
        border-color: #8e8ea9;
        width: 1.875rem;
        height: 1.875rem;
      }

      .c0 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
      }

      .c3 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
      }

      .c7 {
        -webkit-align-items: flex-start;
        -webkit-box-align: flex-start;
        -ms-flex-align: flex-start;
        align-items: flex-start;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
      }

      .c6 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c11 {
        font-size: 0.875rem;
        line-height: 1.43;
        font-weight: 500;
        color: #ffffff;
      }

      .c14 {
        font-size: 0.875rem;
        line-height: 1.43;
        font-weight: 500;
        color: #666687;
      }

      .c5 path {
        fill: #ffffff;
      }

      <div
        class=""
      >
        <div
          class=""
        >
          <div
            class="c0"
          >
            <div
              class="c1"
            >
              <div
                class="c2 c3"
                height="1.875rem"
                width="1.875rem"
              >
                <svg
                  aria-hidden="true"
                  class="c4 c5"
                  fill="none"
                  height="1em"
                  viewBox="0 0 24 24"
                  width="1rem"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20.727 2.97a.2.2 0 01.286 0l2.85 2.89a.2.2 0 010 .28L9.554 20.854a.2.2 0 01-.285 0l-9.13-9.243a.2.2 0 010-.281l2.85-2.892a.2.2 0 01.284 0l6.14 6.209L20.726 2.97z"
                    fill="#212134"
                  />
                </svg>
              </div>
            </div>
            <h3
              class="c6"
            >
              title s1
            </h3>
          </div>
          <div
            class="c7"
          >
            <div
              class="c8 c3"
            >
              <div
                class="c9"
                height="100%"
                width="0.125rem"
              />
            </div>
            <div
              class="c10"
            />
          </div>
        </div>
        <div
          class=""
        >
          <div
            class="c0"
          >
            <div
              class="c1"
            >
              <div
                class="c2 c3"
                height="1.875rem"
                width="1.875rem"
              >
                <span
                  class="c11"
                >
                  2
                </span>
              </div>
            </div>
            <h3
              class="c6"
            >
              title s2
            </h3>
          </div>
          <div
            class="c7"
          >
            <div
              class="c8 c3"
            >
              <div
                class="c12"
                height="100%"
                width="0.125rem"
              />
            </div>
            <div
              class="c10"
            >
              <div>
                s2 content
              </div>
            </div>
          </div>
        </div>
        <div
          class=""
        >
          <div
            class="c0"
          >
            <div
              class="c1"
            >
              <div
                class="c13 c3"
                height="1.875rem"
                width="1.875rem"
              >
                <span
                  class="c14"
                >
                  3
                </span>
              </div>
            </div>
            <h3
              class="c6"
            >
              title s3
            </h3>
          </div>
          <div
            class="c7"
          >
            <div
              class="c8 c3"
            />
            <div
              class="c10"
            />
          </div>
        </div>
      </div>
    `);
  });

  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(App(<Stepper sections={sections} />));

    expect(firstChild).toMatchInlineSnapshot(`
      .c1 {
        margin-right: 20px;
        min-width: 1.875rem;
      }

      .c2 {
        background: #4945ff;
        padding: 8px;
        border-radius: 50%;
        width: 1.875rem;
        height: 1.875rem;
      }

      .c4 {
        color: #ffffff;
        width: 1rem;
      }

      .c8 {
        margin-right: 20px;
        margin-top: 12px;
        margin-bottom: 12px;
        min-width: 1.875rem;
      }

      .c9 {
        background: #7b79ff;
        border-radius: 4px;
        width: 0.125rem;
        height: 100%;
        min-height: 4.0625rem;
      }

      .c10 {
        margin-top: 8px;
      }

      .c0 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
      }

      .c3 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
      }

      .c7 {
        -webkit-align-items: flex-start;
        -webkit-box-align: flex-start;
        -ms-flex-align: flex-start;
        align-items: flex-start;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
      }

      .c6 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c5 path {
        fill: #ffffff;
      }

      <div
        class=""
      >
        <div
          class=""
        >
          <div
            class="c0"
          >
            <div
              class="c1"
            >
              <div
                class="c2 c3"
                height="1.875rem"
                width="1.875rem"
              >
                <svg
                  aria-hidden="true"
                  class="c4 c5"
                  fill="none"
                  height="1em"
                  viewBox="0 0 24 24"
                  width="1rem"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20.727 2.97a.2.2 0 01.286 0l2.85 2.89a.2.2 0 010 .28L9.554 20.854a.2.2 0 01-.285 0l-9.13-9.243a.2.2 0 010-.281l2.85-2.892a.2.2 0 01.284 0l6.14 6.209L20.726 2.97z"
                    fill="#212134"
                  />
                </svg>
              </div>
            </div>
            <h3
              class="c6"
            >
              title s1
            </h3>
          </div>
          <div
            class="c7"
          >
            <div
              class="c8 c3"
            >
              <div
                class="c9"
                height="100%"
                width="0.125rem"
              />
            </div>
            <div
              class="c10"
            />
          </div>
        </div>
        <div
          class=""
        >
          <div
            class="c0"
          >
            <div
              class="c1"
            >
              <div
                class="c2 c3"
                height="1.875rem"
                width="1.875rem"
              >
                <svg
                  aria-hidden="true"
                  class="c4 c5"
                  fill="none"
                  height="1em"
                  viewBox="0 0 24 24"
                  width="1rem"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20.727 2.97a.2.2 0 01.286 0l2.85 2.89a.2.2 0 010 .28L9.554 20.854a.2.2 0 01-.285 0l-9.13-9.243a.2.2 0 010-.281l2.85-2.892a.2.2 0 01.284 0l6.14 6.209L20.726 2.97z"
                    fill="#212134"
                  />
                </svg>
              </div>
            </div>
            <h3
              class="c6"
            >
              title s2
            </h3>
          </div>
          <div
            class="c7"
          >
            <div
              class="c8 c3"
            >
              <div
                class="c9"
                height="100%"
                width="0.125rem"
              />
            </div>
            <div
              class="c10"
            />
          </div>
        </div>
        <div
          class=""
        >
          <div
            class="c0"
          >
            <div
              class="c1"
            >
              <div
                class="c2 c3"
                height="1.875rem"
                width="1.875rem"
              >
                <svg
                  aria-hidden="true"
                  class="c4 c5"
                  fill="none"
                  height="1em"
                  viewBox="0 0 24 24"
                  width="1rem"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20.727 2.97a.2.2 0 01.286 0l2.85 2.89a.2.2 0 010 .28L9.554 20.854a.2.2 0 01-.285 0l-9.13-9.243a.2.2 0 010-.281l2.85-2.892a.2.2 0 01.284 0l6.14 6.209L20.726 2.97z"
                    fill="#212134"
                  />
                </svg>
              </div>
            </div>
            <h3
              class="c6"
            >
              title s3
            </h3>
          </div>
          <div
            class="c7"
          >
            <div
              class="c8 c3"
            />
            <div
              class="c10"
            />
          </div>
        </div>
      </div>
    `);
  });
});
