import * as React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import Preview from '../Preview';

describe('RepeatableComponent | Preview', () => {
  it('should render and match the snapshot', () => {
    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <Preview />
      </ThemeProvider>
    );
    expect(container).toMatchSnapshot();
  });
});
