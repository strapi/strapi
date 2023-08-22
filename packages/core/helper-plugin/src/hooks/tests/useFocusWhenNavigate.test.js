import React from 'react';

import { screen, render, renderHook } from '@testing-library/react';

import { useFocusWhenNavigate } from '../useFocusWhenNavigate';

describe('useFocusWhenNavigate', () => {
  it('useFocusWhenNavigate focuses on the specified element', () => {
    render(<div id="main">This is the main content</div>);

    renderHook(() => useFocusWhenNavigate());

    const mainElement = screen.getByText('This is the main content');

    expect(mainElement).toHaveFocus();

    screen.debug;
  });
});
