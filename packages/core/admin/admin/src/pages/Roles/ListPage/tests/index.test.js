/**
 *
 * Tests for ListPage
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import ListPage from '../index';

describe('<ListPage />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(<ListPage />);

    expect(firstChild).toMatchInlineSnapshot();
  });
});
