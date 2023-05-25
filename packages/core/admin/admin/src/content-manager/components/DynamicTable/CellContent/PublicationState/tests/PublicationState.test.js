import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';

import { PublicationState } from '..';

const ComponentFixture = (props) => (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}}>
      <PublicationState {...props} />
    </IntlProvider>
  </ThemeProvider>
);

const setup = (props) => render(<ComponentFixture {...props} />);

describe('DynamicTable | PublicationState', () => {
  test('render draft state', () => {
    const { container, getByText } = setup({ isPublished: false });

    // retreive styles of rendered component, rather than the container
    const statusNodeStyle = window.getComputedStyle(container.firstChild);
    const textNode = getByText('Draft');

    expect(textNode).toBeInTheDocument();
    expect(statusNodeStyle).toHaveProperty('background-color', 'rgb(234, 245, 255)');
    expect(window.getComputedStyle(textNode)).toHaveProperty('color', 'rgb(12, 117, 175)');
  });

  test('render published state', () => {
    const { container, getByText } = setup({ isPublished: true });

    // retreive styles of rendered component, rather than the container
    const statusNodeStyle = window.getComputedStyle(container.firstChild);
    const textNode = getByText('Published');

    expect(textNode).toBeInTheDocument();
    expect(statusNodeStyle).toHaveProperty('background-color', 'rgb(234, 251, 231)');
    expect(window.getComputedStyle(textNode)).toHaveProperty('color', 'rgb(50, 128, 72)');
  });
});
