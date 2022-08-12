import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { RelationItem } from '../RelationItem';

const setup = ({ endAction }) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <RelationItem endAction={endAction}>First relation</RelationItem>
    </ThemeProvider>
  );

describe('RelationItem', () => {
  it('should render and match snapshot', () => {
    const { container } = setup({});

    expect(container).toMatchSnapshot();
  });

  it('should render endAction and match snapshot', () => {
    const { getByText } = setup({ endAction: <div>end action here</div> });

    expect(getByText('end action here')).toBeInTheDocument();
  });
});
