import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { RelationList, RelationItem } from '../index';

const setup = () =>
  render(
    <ThemeProvider theme={lightTheme}>
      <RelationList>
        <RelationItem>First relation</RelationItem>
        <RelationItem>Second relation</RelationItem>
        <RelationItem>Third relation</RelationItem>
      </RelationList>
    </ThemeProvider>
  );

describe('RelationInput', () => {
  it('should render and match snapshot', () => {
    const { container } = setup();

    expect(container).toMatchSnapshot();
  });
});
