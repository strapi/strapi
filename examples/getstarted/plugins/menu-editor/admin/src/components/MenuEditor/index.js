import React, { useCallback, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { createDndContext, DndProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { ContextProvider, add } from 'react-sortly';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import SortableMenu from './SortableMenu';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

export default function MenuEditor({ editMode, menuItems, showModal, updateModifData }) {
  // Handling all changes in structure
  const handleChange = useCallback(items => {
    updateModifData(items);
  });

  // History for redirection back from create/edit pages
  const history = useHistory();
  const location = strapi.router.location.pathname
    ? strapi.router.location.pathname
    : '/plugins/menu-editor';
  const pages = 'plugins/content-manager/collectionType/application::page.page';

  // Page details
  const handleItemClick = useCallback(item => {
    history.push(`/${pages}/${item.id}?redirectUrl=${location}`);
  }, []);

  // Reset to origin data
  const handleClickReset = useCallback(() => {
    updateModifData(originData);
  }, []);

  // Create drag&drop context according documentation react-sortly
  const manager = useRef(createDndContext(HTML5Backend));

  return (
    <Wrapper>
      <DndProvider manager={manager.current.dragDropManager} backend={HTML5Backend}>
        <ContextProvider>
          <SortableMenu
            editMode={editMode}
            items={menuItems}
            onChange={handleChange}
            onItemClick={handleItemClick}
            onClickCreatePage={showModal}
            onClickReset={handleClickReset}
          />
        </ContextProvider>
      </DndProvider>
    </Wrapper>
  );
}

MenuEditor.propTypes = {
  menuItems: PropTypes.array,
  editMode: PropTypes.any,
  showModal: PropTypes.any,
};
