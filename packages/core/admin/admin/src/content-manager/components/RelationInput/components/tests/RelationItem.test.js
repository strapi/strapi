import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { RelationItem } from '../RelationItem';

const setup = ({ endAction }) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <DndProvider backend={HTML5Backend}>
        <RelationItem id={0} index={0} endAction={endAction}>
          First relation
        </RelationItem>
      </DndProvider>
    </ThemeProvider>
  );

describe('Content-Manager || RelationInput || RelationItem', () => {
  it('should render and match snapshot', () => {
    const { container } = setup({});

    expect(container).toMatchSnapshot();
  });

  it('should render endAction and match snapshot', () => {
    const { getByText } = setup({ endAction: <div>end action here</div> });

    expect(getByText('end action here')).toBeInTheDocument();
  });
});
