import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { RelationItem } from '../RelationItem';
import { RelationList } from '../RelationList';

const setup = ({ endAction }) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <DndProvider backend={HTML5Backend}>
        <RelationList>
          <RelationItem
            ariaDescribedBy="test"
            iconButtonAriaLabel="Drag"
            index={0}
            id={0}
            name="test_field"
            endAction={endAction}
          >
            First relation
          </RelationItem>
          <RelationItem
            ariaDescribedBy="test"
            iconButtonAriaLabel="Drag"
            index={1}
            id={1}
            name="test_field"
            endAction={endAction}
          >
            Second relation
          </RelationItem>
        </RelationList>
      </DndProvider>
    </ThemeProvider>
  );

describe('Content-Manager || RelationInput || RelationList', () => {
  it('should render and match snapshot', () => {
    const { container } = setup({});

    expect(container).toMatchSnapshot();
  });
});
