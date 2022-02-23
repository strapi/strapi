/**
 *
 * Tests for RequiredCheckbox
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import RequiredCheckbox from '../index';

const messages = {
  'form.attribute.item.admin-hidden-field': 'Hidden field',
  'form.attribute.item.admin-hidden-field.description':
    'This field will not show up in the Admin API',
};

describe('<RequiredCheckbox />', () => {
  it('renders and matches the snapshot', () => {
    const props = {
      modifiedData: {
        adminOptions: { hidden: false },
        required: true,
      },
      name: 'required',
      onChange: jest.fn(),
      intlLabel: {
        id: 'form.attribute.item.requiredField',
        defaultMessage: 'Required field',
      },
      description: {
        id: 'form.attribute.item.requiredField.description',
        defaultMessage: "You won't be able to create an entry if this field is empty",
      },
      value: true,
    };

    const {
      container: { firstChild },
    } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={messages} defaultLocale="en">
          <RequiredCheckbox {...props} />
        </IntlProvider>
      </ThemeProvider>
    );

    expect(firstChild).toMatchInlineSnapshot(`
      .c3 {
        margin: 0;
        height: 18px;
        min-width: 18px;
        border-radius: 4px;
        border: 1px solid #c0c0cf;
        -webkit-appearance: none;
        background-color: #ffffff;
        cursor: pointer;
      }

      .c3:checked {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c3:checked:after {
        content: '';
        display: block;
        position: relative;
        background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGgKICAgIGQ9Ik04LjU1MzIzIDAuMzk2OTczQzguNjMxMzUgMC4zMTYzNTUgOC43NjA1MSAwLjMxNTgxMSA4LjgzOTMxIDAuMzk1NzY4TDkuODYyNTYgMS40MzQwN0M5LjkzODkzIDEuNTExNTcgOS45MzkzNSAxLjYzNTkgOS44NjM0OSAxLjcxMzlMNC4wNjQwMSA3LjY3NzI0QzMuOTg1OSA3Ljc1NzU1IDMuODU3MDcgNy43NTgwNSAzLjc3ODM0IDcuNjc4MzRMMC4xMzg2NiAzLjk5MzMzQzAuMDYxNzc5OCAzLjkxNTQ5IDAuMDYxNzEwMiAzLjc5MDMyIDAuMTM4NTA0IDMuNzEyNEwxLjE2MjEzIDIuNjczNzJDMS4yNDAzOCAyLjU5NDMyIDEuMzY4NDMgMi41OTQyMiAxLjQ0NjggMi42NzM0OEwzLjkyMTc0IDUuMTc2NDdMOC41NTMyMyAwLjM5Njk3M1oiCiAgICBmaWxsPSJ3aGl0ZSIKICAvPgo8L3N2Zz4=) no-repeat no-repeat center center;
        width: 10px;
        height: 10px;
        left: 50%;
        top: 50%;
        -webkit-transform: translateX(-50%) translateY(-50%);
        -ms-transform: translateX(-50%) translateY(-50%);
        transform: translateX(-50%) translateY(-50%);
      }

      .c3:checked:disabled:after {
        background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGgKICAgIGQ9Ik04LjU1MzIzIDAuMzk2OTczQzguNjMxMzUgMC4zMTYzNTUgOC43NjA1MSAwLjMxNTgxMSA4LjgzOTMxIDAuMzk1NzY4TDkuODYyNTYgMS40MzQwN0M5LjkzODkzIDEuNTExNTcgOS45MzkzNSAxLjYzNTkgOS44NjM0OSAxLjcxMzlMNC4wNjQwMSA3LjY3NzI0QzMuOTg1OSA3Ljc1NzU1IDMuODU3MDcgNy43NTgwNSAzLjc3ODM0IDcuNjc4MzRMMC4xMzg2NiAzLjk5MzMzQzAuMDYxNzc5OCAzLjkxNTQ5IDAuMDYxNzEwMiAzLjc5MDMyIDAuMTM4NTA0IDMuNzEyNEwxLjE2MjEzIDIuNjczNzJDMS4yNDAzOCAyLjU5NDMyIDEuMzY4NDMgMi41OTQyMiAxLjQ0NjggMi42NzM0OEwzLjkyMTc0IDUuMTc2NDdMOC41NTMyMyAwLjM5Njk3M1oiCiAgICBmaWxsPSIjOEU4RUE5IgogIC8+Cjwvc3ZnPg==) no-repeat no-repeat center center;
      }

      .c3:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c3:indeterminate {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c3:indeterminate:after {
        content: '';
        display: block;
        position: relative;
        color: white;
        height: 2px;
        width: 10px;
        background-color: #ffffff;
        left: 50%;
        top: 50%;
        -webkit-transform: translateX(-50%) translateY(-50%);
        -ms-transform: translateX(-50%) translateY(-50%);
        transform: translateX(-50%) translateY(-50%);
      }

      .c3:indeterminate:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c3:indeterminate:disabled:after {
        background-color: #8e8ea9;
      }

      .c4 {
        padding-left: 8px;
      }

      .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c0 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c0 > * + * {
        margin-top: 4px;
      }

      .c1 {
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c5 {
        color: #666687;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c2 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: flex-start;
        -webkit-box-align: flex-start;
        -ms-flex-align: flex-start;
        align-items: flex-start;
      }

      .c2 * {
        cursor: pointer;
      }

      <div>
        <div
          class="c0"
        >
          <label
            class="c1 c2"
          >
            <input
              aria-describedby="required-hint"
              checked=""
              class="c3"
              id="required"
              name="required"
              type="checkbox"
            />
            <div
              class="c4"
            >
              Required field
            </div>
          </label>
          <p
            class="c5"
            id="required-hint"
          >
            You won't be able to create an entry if this field is empty
          </p>
        </div>
      </div>
    `);
  });

  it('shows a disabled state when adminOptions.hidden is enabled', () => {
    const props = {
      modifiedData: {
        adminOptions: { hidden: true },
        required: false,
      },
      name: 'required',
      onChange: jest.fn(),
      intlLabel: {
        id: 'form.attribute.item.requiredField',
        defaultMessage: 'Required field',
      },
      description: {
        id: 'form.attribute.item.requiredField.description',
        defaultMessage: "You won't be able to create an entry if this field is empty",
      },
      value: false,
    };

    const {
      container: { firstChild },
    } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={messages} defaultLocale="en">
          <RequiredCheckbox {...props} />
        </IntlProvider>
      </ThemeProvider>
    );

    expect(firstChild).toMatchInlineSnapshot(`
      .c3 {
        margin: 0;
        height: 18px;
        min-width: 18px;
        border-radius: 4px;
        border: 1px solid #c0c0cf;
        -webkit-appearance: none;
        background-color: #ffffff;
        cursor: pointer;
      }

      .c3:checked {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c3:checked:after {
        content: '';
        display: block;
        position: relative;
        background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGgKICAgIGQ9Ik04LjU1MzIzIDAuMzk2OTczQzguNjMxMzUgMC4zMTYzNTUgOC43NjA1MSAwLjMxNTgxMSA4LjgzOTMxIDAuMzk1NzY4TDkuODYyNTYgMS40MzQwN0M5LjkzODkzIDEuNTExNTcgOS45MzkzNSAxLjYzNTkgOS44NjM0OSAxLjcxMzlMNC4wNjQwMSA3LjY3NzI0QzMuOTg1OSA3Ljc1NzU1IDMuODU3MDcgNy43NTgwNSAzLjc3ODM0IDcuNjc4MzRMMC4xMzg2NiAzLjk5MzMzQzAuMDYxNzc5OCAzLjkxNTQ5IDAuMDYxNzEwMiAzLjc5MDMyIDAuMTM4NTA0IDMuNzEyNEwxLjE2MjEzIDIuNjczNzJDMS4yNDAzOCAyLjU5NDMyIDEuMzY4NDMgMi41OTQyMiAxLjQ0NjggMi42NzM0OEwzLjkyMTc0IDUuMTc2NDdMOC41NTMyMyAwLjM5Njk3M1oiCiAgICBmaWxsPSJ3aGl0ZSIKICAvPgo8L3N2Zz4=) no-repeat no-repeat center center;
        width: 10px;
        height: 10px;
        left: 50%;
        top: 50%;
        -webkit-transform: translateX(-50%) translateY(-50%);
        -ms-transform: translateX(-50%) translateY(-50%);
        transform: translateX(-50%) translateY(-50%);
      }

      .c3:checked:disabled:after {
        background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGgKICAgIGQ9Ik04LjU1MzIzIDAuMzk2OTczQzguNjMxMzUgMC4zMTYzNTUgOC43NjA1MSAwLjMxNTgxMSA4LjgzOTMxIDAuMzk1NzY4TDkuODYyNTYgMS40MzQwN0M5LjkzODkzIDEuNTExNTcgOS45MzkzNSAxLjYzNTkgOS44NjM0OSAxLjcxMzlMNC4wNjQwMSA3LjY3NzI0QzMuOTg1OSA3Ljc1NzU1IDMuODU3MDcgNy43NTgwNSAzLjc3ODM0IDcuNjc4MzRMMC4xMzg2NiAzLjk5MzMzQzAuMDYxNzc5OCAzLjkxNTQ5IDAuMDYxNzEwMiAzLjc5MDMyIDAuMTM4NTA0IDMuNzEyNEwxLjE2MjEzIDIuNjczNzJDMS4yNDAzOCAyLjU5NDMyIDEuMzY4NDMgMi41OTQyMiAxLjQ0NjggMi42NzM0OEwzLjkyMTc0IDUuMTc2NDdMOC41NTMyMyAwLjM5Njk3M1oiCiAgICBmaWxsPSIjOEU4RUE5IgogIC8+Cjwvc3ZnPg==) no-repeat no-repeat center center;
      }

      .c3:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c3:indeterminate {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c3:indeterminate:after {
        content: '';
        display: block;
        position: relative;
        color: white;
        height: 2px;
        width: 10px;
        background-color: #ffffff;
        left: 50%;
        top: 50%;
        -webkit-transform: translateX(-50%) translateY(-50%);
        -ms-transform: translateX(-50%) translateY(-50%);
        transform: translateX(-50%) translateY(-50%);
      }

      .c3:indeterminate:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c3:indeterminate:disabled:after {
        background-color: #8e8ea9;
      }

      .c4 {
        padding-left: 8px;
      }

      .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c0 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c0 > * + * {
        margin-top: 4px;
      }

      .c1 {
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c5 {
        color: #666687;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c2 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: flex-start;
        -webkit-box-align: flex-start;
        -ms-flex-align: flex-start;
        align-items: flex-start;
      }

      .c2 * {
        cursor: not-allowed;
      }

      <div>
        <div
          class="c0"
        >
          <label
            class="c1 c2"
            disabled=""
          >
            <input
              aria-describedby="required-hint"
              class="c3"
              disabled=""
              id="required"
              name="required"
              type="checkbox"
            />
            <div
              class="c4"
            >
              Required field
            </div>
          </label>
          <p
            class="c5"
            id="required-hint"
          >
            You won't be able to create an entry if this field is empty
          </p>
        </div>
      </div>
    `);
  });
});
