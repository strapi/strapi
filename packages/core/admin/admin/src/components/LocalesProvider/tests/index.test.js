import React from 'react';
import { render } from '@testing-library/react';
import LocalesProvider from '../index';

describe('LocalesProvider', () => {
  it('should not crash', () => {
    const { container } = render(
      <LocalesProvider
        changeLocale={jest.fn()}
        localeNames={{ en: 'English' }}
        messages={{ en: {} }}
      >
        <div>Test</div>
      </LocalesProvider>
    );

    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        Test
      </div>
    `);
  });
});
