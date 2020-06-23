import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { createDndContext, DndProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { ContextProvider } from 'react-sortly';
import styled from 'styled-components';
import SortableMenu from './SortableMenu';

export default function MenuEditor({ items, handleMove }) {
  // Create drag&drop context according documentation react-sortly
  const manager = useRef(createDndContext(HTML5Backend));

  return (
    <Wrapper>
      <DndProvider manager={manager.current.dragDropManager} backend={HTML5Backend}>
        <ContextProvider>
          <SortableMenu items={items} onChange={handleMove} />
        </ContextProvider>
      </DndProvider>
    </Wrapper>
  );
}

MenuEditor.propTypes = {
  items: PropTypes.array.isRequired,
  handleMove: PropTypes.func.isRequired,
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
`;
