/**
 *
 * Tests for BooleanDefaultValueSelect
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import BooleanDefaultValueSelect from '../index';

describe('<BooleanDefaultValueSelect />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(
      <ThemeProvider theme={lightTheme}>
        <BooleanDefaultValueSelect />
      </ThemeProvider>
    );

    expect(firstChild).toMatchInlineSnapshot();
  });
});
