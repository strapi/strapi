import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { RelationItem } from '../RelationItem';
import { RelationList } from '../RelationList';

const setup = ({ endAction }) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <RelationList>
        <RelationItem endAction={endAction}>First relation</RelationItem>
      </RelationList>
    </ThemeProvider>
  );

describe('Content-Manager || RelationInput || RelationList', () => {
  it('should render and match snapshot', () => {
    const { container } = setup({});

    expect(container).toMatchSnapshot();
  });
});
