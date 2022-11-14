import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import { ThemeProvider, lightTheme } from '@strapi/design-system';

import GlobalStyle from '../../../../../components/GlobalStyle';

import ComponentCard from '../ComponentCard';

describe('ComponentCard', () => {
  const setup = (props) =>
    render(
      <ThemeProvider theme={lightTheme}>
        <ComponentCard {...props}>test</ComponentCard>
        <GlobalStyle />
      </ThemeProvider>
    );

  it('should render children by default', () => {
    const { getByTestId, getByText } = setup();
    expect(getByText('test')).toBeInTheDocument();
    expect(getByTestId('component-card-icon')).toMatchInlineSnapshot(`
      .c1 {
        width: 2rem !important;
        height: 2rem !important;
        padding: 0.5625rem;
        border-radius: 4rem;
        background: #eaeaef;
      }

      .c1 path {
        fill: #8e8ea9;
      }

      .c2.active .c0,
      .c2:hover .c0 {
        background: #d9d8ff;
      }

      .c2.active .c0 path,
      .c2:hover .c0 path {
        fill: #4945ff;
      }

      <svg
        aria-hidden="true"
        class="svg-inline--fa fa-dice-d6 c0 c1"
        data-icon="dice-d6"
        data-prefix="fas"
        data-testid="component-card-icon"
        focusable="false"
        role="img"
        viewBox="0 0 448 512"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M422.19 109.95L256.21 9.07c-19.91-12.1-44.52-12.1-64.43 0L25.81 109.95c-5.32 3.23-5.29 11.27.06 14.46L224 242.55l198.14-118.14c5.35-3.19 5.38-11.22.05-14.46zm13.84 44.63L240 271.46v223.82c0 12.88 13.39 20.91 24.05 14.43l152.16-92.48c19.68-11.96 31.79-33.94 31.79-57.7v-197.7c0-6.41-6.64-10.43-11.97-7.25zM0 161.83v197.7c0 23.77 12.11 45.74 31.79 57.7l152.16 92.47c10.67 6.48 24.05-1.54 24.05-14.43V271.46L11.97 154.58C6.64 151.4 0 155.42 0 161.83z"
          fill="currentColor"
        />
      </svg>
    `);
  });

  it('should render a valid icon when passed its name', () => {
    const { getByTestId } = setup({ icon: 'fa-camera' });
    expect(getByTestId('component-card-icon')).toMatchInlineSnapshot(`
      .c1 {
        width: 2rem !important;
        height: 2rem !important;
        padding: 0.5625rem;
        border-radius: 4rem;
        background: #eaeaef;
      }

      .c1 path {
        fill: #8e8ea9;
      }

      .c2.active .c0,
      .c2:hover .c0 {
        background: #d9d8ff;
      }

      .c2.active .c0 path,
      .c2:hover .c0 path {
        fill: #4945ff;
      }

      <svg
        aria-hidden="true"
        class="svg-inline--fa fa-camera c0 c1"
        data-icon="camera"
        data-prefix="fas"
        data-testid="component-card-icon"
        focusable="false"
        role="img"
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M512 144v288c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V144c0-26.5 21.5-48 48-48h88l12.3-32.9c7-18.7 24.9-31.1 44.9-31.1h125.5c20 0 37.9 12.4 44.9 31.1L376 96h88c26.5 0 48 21.5 48 48zM376 288c0-66.2-53.8-120-120-120s-120 53.8-120 120 53.8 120 120 120 120-53.8 120-120zm-32 0c0 48.5-39.5 88-88 88s-88-39.5-88-88 39.5-88 88-88 88 39.5 88 88z"
          fill="currentColor"
        />
      </svg>
    `);
  });

  it('should call the onClick handler when passed', () => {
    const onClick = jest.fn();
    const { getByText } = setup({ onClick });
    fireEvent.click(getByText('test'));
    expect(onClick).toHaveBeenCalled();
  });
});
