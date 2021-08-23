/**
 *
 * Tests for CreatePage
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CreatePage } from './index';

describe('<CreatePage />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(<CreatePage />);

    expect(firstChild).toMatchInlineSnapshot();
  });
});
