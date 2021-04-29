import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from '../../../../../../strapi-admin/admin/src/themes';

import EmptyInputMedia from '../EmptyInputMedia';

jest.mock('../../../utils', () => ({
  getTrad: id => id,
}));

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: ({ id }) => id }),
}));

describe('EmptyInputMedia', () => {
  it('shows the inital state', () => {
    render(
      <ThemeProvider theme={themes}>
        <EmptyInputMedia>
          <div>Some content</div>
        </EmptyInputMedia>
      </ThemeProvider>
    );

    expect(screen.getByText('Some content')).toBeVisible();
    expect(screen.getByTitle('input.placeholder.icon').textContent).toBe('input.placeholder.icon');
  });

  it('shows the state when something is dragging in', () => {
    const { container } = render(
      <ThemeProvider theme={themes}>
        <EmptyInputMedia>
          <div>Some content</div>
        </EmptyInputMedia>
      </ThemeProvider>
    );

    fireEvent(container.firstChild, new Event('dragenter', { bubbles: true }));

    expect(screen.queryByText('Some content')).toBeFalsy();
    expect(screen.getByTitle('input.placeholder.icon').textContent).toBe('input.placeholder.icon');
  });

  it('shows the initial state when something is dragging in and then out', () => {
    const { container } = render(
      <ThemeProvider theme={themes}>
        <EmptyInputMedia>
          <div>Some content</div>
        </EmptyInputMedia>
      </ThemeProvider>
    );

    fireEvent(container.firstChild, new Event('dragenter', { bubbles: true }));
    fireEvent(container.firstChild, new Event('dragleave', { bubbles: true }));

    expect(screen.getByText('Some content')).toBeVisible();
    expect(screen.getByTitle('input.placeholder.icon').textContent).toBe('input.placeholder.icon');
  });
});
