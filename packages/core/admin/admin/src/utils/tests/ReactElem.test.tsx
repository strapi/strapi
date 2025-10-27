// React test without JSX
import React from 'react';
import { render, screen } from '@testing-library/react';

// Create elements using React.createElement to avoid JSX transform issues
const HelloElement = React.createElement('div', null, 'Hello From createElement');

describe('React createElement Test', () => {
  it('renders without JSX', () => {
    render(HelloElement);
    expect(screen.getByText('Hello From createElement')).toBeTruthy();
  });
});