import * as React from 'react';

import { render, screen } from '@tests/utils';

import { WidgetErrorBoundary } from '../WidgetErrorBoundary';

const BrokenWidget = () => {
  throw new Error('widget failed');
};

describe('WidgetErrorBoundary', () => {
  it('renders the widget error state when a child throws', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <WidgetErrorBoundary>
        <BrokenWidget />
      </WidgetErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText("Couldn't load widget content.")).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it('renders the child when it does not throw', () => {
    render(
      <WidgetErrorBoundary>
        <p>widget content</p>
      </WidgetErrorBoundary>
    );

    expect(screen.getByText('widget content')).toBeInTheDocument();
  });
});
