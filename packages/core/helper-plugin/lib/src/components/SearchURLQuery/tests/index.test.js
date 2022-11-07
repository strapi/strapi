/**
 *
 * Tests for SearchURLQuery
 *
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import SearchURLQuery from '../index';

const trackUsage = jest.fn();
jest.mock('../../../hooks/useTracking', () => () => ({
  trackUsage,
}));

const makeApp = (history, trackedEvent) => (
  <Router history={history}>
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en">
        <SearchURLQuery label="Search label" trackedEvent={trackedEvent} />
      </IntlProvider>
    </ThemeProvider>
  </Router>
);

describe('<SearchURLQuery />', () => {
  it('renders and matches the snapshot', () => {
    const history = createMemoryHistory();
    const { container } = render(makeApp(history));

    expect(container).toMatchInlineSnapshot(`
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

      .c2 {
        color: #32324d;
      }

      .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        background: #ffffff;
        border: 1px solid #dcdce4;
        position: relative;
        outline: none;
      }

      .c0 svg {
        height: 12px;
        width: 12px;
      }

      .c0 svg > g,
      .c0 svg path {
        fill: #ffffff;
      }

      .c0[aria-disabled='true'] {
        pointer-events: none;
      }

      .c0:after {
        -webkit-transition-property: all;
        transition-property: all;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -4px;
        bottom: -4px;
        left: -4px;
        right: -4px;
        border: 2px solid transparent;
      }

      .c0:focus-visible {
        outline: none;
      }

      .c0:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c1 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
        height: 2rem;
        width: 2rem;
      }

      .c1 svg > g,
      .c1 svg path {
        fill: #8e8ea9;
      }

      .c1:hover svg > g,
      .c1:hover svg path {
        fill: #666687;
      }

      .c1:active svg > g,
      .c1:active svg path {
        fill: #a5a5ba;
      }

      .c1[aria-disabled='true'] {
        background-color: #eaeaef;
      }

      .c1[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c3 path {
        fill: #32324d;
      }

      <div>
        <span>
          <button
            aria-disabled="false"
            aria-labelledby="tooltip-1"
            class="c0 c1"
            tabindex="0"
            type="button"
          >
            <svg
              class="c2 c3"
              fill="none"
              height="1em"
              viewBox="0 0 24 24"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                clip-rule="evenodd"
                d="M23.813 20.163l-5.3-5.367a9.792 9.792 0 001.312-4.867C19.825 4.455 15.375 0 9.913 0 4.45 0 0 4.455 0 9.929c0 5.473 4.45 9.928 9.912 9.928a9.757 9.757 0 005.007-1.4l5.275 5.35a.634.634 0 00.913 0l2.706-2.737a.641.641 0 000-.907zM9.91 3.867c3.338 0 6.05 2.718 6.05 6.061s-2.712 6.061-6.05 6.061c-3.337 0-6.05-2.718-6.05-6.06 0-3.344 2.713-6.062 6.05-6.062z"
                fill="#32324D"
                fill-rule="evenodd"
              />
            </svg>
          </button>
        </span>
        <div
          class="c4"
        >
          <p
            aria-live="polite"
            aria-relevant="all"
            id="live-region-log"
            role="log"
          />
          <p
            aria-live="polite"
            aria-relevant="all"
            id="live-region-status"
            role="status"
          />
          <p
            aria-live="assertive"
            aria-relevant="all"
            id="live-region-alert"
            role="alert"
          />
        </div>
      </div>
    `);
  });

  it('should toggle searchbar form and searchbar', async () => {
    const history = createMemoryHistory();
    const { container } = render(makeApp(history));

    fireEvent.click(container.querySelector('button[type="button"]'));

    expect(container).toMatchInlineSnapshot(`
      .c11 {
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

      .c7 {
        padding-right: 8px;
        padding-left: 12px;
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
      }

      .c5 {
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
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
      }

      .c2 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c10 {
        border: none;
        border-radius: 4px;
        padding-bottom: 0.40625rem;
        padding-left: 0;
        padding-right: 16px;
        padding-top: 0.40625rem;
        color: #32324d;
        font-weight: 400;
        font-size: 0.875rem;
        display: block;
        width: 100%;
        background: inherit;
      }

      .c10::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c10::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c10:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c10::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c10[aria-disabled='true'] {
        color: inherit;
      }

      .c10:focus {
        outline: none;
        box-shadow: none;
      }

      .c6 {
        border: 1px solid #dcdce4;
        border-radius: 4px;
        background: #ffffff;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c6:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c1 {
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

      .c9 {
        font-size: 0.8rem;
      }

      .c9 svg path {
        fill: #32324d;
      }

      .c0 {
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c0:focus-within .c8 svg path {
        fill: #4945ff;
      }

      .c0 .c4 {
        border: 1px solid transparent;
      }

      .c0 .c4:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      <div>
        <div>
          <form
            role="search"
          >
            <div
              class="c0"
            >
              <div>
                <div
                  class="c1"
                >
                  <label
                    class="c2"
                    for="field-5"
                  >
                    <div
                      class="c3"
                    >
                      Search label
                    </div>
                  </label>
                </div>
                <div
                  class="c4 c5 c6"
                >
                  <div
                    class="c7"
                  >
                    <div
                      class="c8 c3 c9"
                    >
                      <svg
                        aria-hidden="true"
                        fill="none"
                        height="1em"
                        viewBox="0 0 24 24"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          clip-rule="evenodd"
                          d="M23.813 20.163l-5.3-5.367a9.792 9.792 0 001.312-4.867C19.825 4.455 15.375 0 9.913 0 4.45 0 0 4.455 0 9.929c0 5.473 4.45 9.928 9.912 9.928a9.757 9.757 0 005.007-1.4l5.275 5.35a.634.634 0 00.913 0l2.706-2.737a.641.641 0 000-.907zM9.91 3.867c3.338 0 6.05 2.718 6.05 6.061s-2.712 6.061-6.05 6.061c-3.337 0-6.05-2.718-6.05-6.06 0-3.344 2.713-6.062 6.05-6.062z"
                          fill="#32324D"
                          fill-rule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                  <input
                    aria-disabled="false"
                    aria-invalid="false"
                    class="c10"
                    id="field-5"
                    name="search"
                    value=""
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
        <div
          class="c11"
        >
          <p
            aria-live="polite"
            aria-relevant="all"
            id="live-region-log"
            role="log"
          />
          <p
            aria-live="polite"
            aria-relevant="all"
            id="live-region-status"
            role="status"
          />
          <p
            aria-live="assertive"
            aria-relevant="all"
            id="live-region-alert"
            role="alert"
          />
        </div>
      </div>
    `);
  });

  it('should push value to query params', async () => {
    const history = createMemoryHistory();
    const { container } = render(makeApp(history));

    fireEvent.click(container.querySelector('button[type="button"]'));

    const input = container.querySelector('input[name="search"]');
    fireEvent.change(input, { target: { value: 'michka' } });
    fireEvent.submit(input);

    const urlSearchQuery = history.location.search;
    expect(urlSearchQuery).toEqual('?_q=michka&page=1');
  });

  it('should clear value and update query params', async () => {
    const history = createMemoryHistory();
    const { container } = render(makeApp(history));

    fireEvent.click(container.querySelector('button[type="button"]'));

    const input = container.querySelector('input[name="search"]');
    fireEvent.change(input, { target: { value: 'michka' } });
    fireEvent.submit(input);

    const urlSearchQuery = history.location.search;
    expect(urlSearchQuery).toEqual('?_q=michka&page=1');

    fireEvent.click(container.querySelector('button[aria-label="Clear"]'));

    expect(input.value).toEqual('');

    const clearedUrlSearchQuery = history.location.search;
    expect(clearedUrlSearchQuery).toEqual('?page=1');
  });

  it('should call trackUsage with trackedEvent props when submit', async () => {
    const history = createMemoryHistory();
    const { container } = render(makeApp(history, 'thisEvent'));

    fireEvent.click(container.querySelector('button[type="button"]'));

    const input = container.querySelector('input[name="search"]');
    fireEvent.change(input, { target: { value: 'michka' } });
    fireEvent.submit(input);

    expect(trackUsage.mock.calls.length).toBe(1);
  });
});
