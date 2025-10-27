import React from 'react';
import { render, screen } from '@testing-library/react';

function HelloWorld() {
  return <div>Hello World</div>;
}

describe('React Test', () => {
  it('works with JSX and jest-dom matchers', () => {
    render(<HelloWorld />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});