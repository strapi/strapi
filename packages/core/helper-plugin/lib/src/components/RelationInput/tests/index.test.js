import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { RelationList, RelationItem } from '../index';

const setup = ({ endAction }) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <RelationList>
        <RelationItem endAction={endAction}>First relation</RelationItem>
        <RelationItem>Second relation</RelationItem>
        <RelationItem>Third relation</RelationItem>
      </RelationList>
    </ThemeProvider>
  );

describe('RelationInput', () => {
  it('should render and match snapshot', () => {
    const { container } = setup({});

    expect(container).toMatchSnapshot();
  });

  it('should render endAction and match snapshot', () => {
    const { container } = setup({ endAction: <div>end action here</div> });

    expect(container).toMatchSnapshot();
    expect(screen.getByText('end action here')).toBeInTheDocument();
  });
});
