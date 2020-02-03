/* eslint-disable import/no-unresolved */
import React, { useCallback, useRef } from 'react';
import { ContextProvider } from 'react-sortly';
import { createDndContext, DndProvider } from 'react-dnd';
import { FormattedMessage } from 'react-intl';
import { useHistory } from 'react-router-dom';
import HTML5Backend from 'react-dnd-html5-backend';
import nanoid from 'nanoid/non-secure';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import SortableMenu from './SortableMenu';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

const newItemLabel = (
  <FormattedMessage id="menu-editor.MenuEditor.addNewItem" />
);

function createNewItem(items) {
  return {
    id: nanoid(12),
    isNew: true,
    name: { newItemLabel } + items.length,
  };
}

export default function MenuEditor({ onChange, editMode, menuItems }) {
  // Handling all changes in structure
  const handleChange = useCallback(
    items => {
      onChange('menuItems', items);
    },
    [onChange]
  );

  const history = useHistory();
  const location = strapi.router.location.pathname
    ? strapi.router.location.pathname
    : '/plugins/menu-editor';
  const pages = 'plugins/content-manager/application::pages.pages';

  // Page details
  const handleItemClick = useCallback(
    item => {
      history.push(`/${pages}/${item.id}?redirectUrl=${location}`);
    },
    [history, location]
  );

  // Create new page
  const handleClickAddNew = useCallback(() => {
    history.push(`/${pages}/create?redirectUrl=${location}`);
  }, [history, location]);

  const manager = useRef(createDndContext(HTML5Backend));

  return (
    <Wrapper>
      {menuItems.length > 0 ? (
        <DndProvider
          manager={manager.current.dragDropManager}
          backend={HTML5Backend}
        >
          <ContextProvider>
            <SortableMenu
              itemCreator={createNewItem}
              editMode={editMode}
              items={menuItems}
              onChange={handleChange}
              onItemClick={handleItemClick}
              onClickCreatePage={handleClickAddNew}
            />
          </ContextProvider>
        </DndProvider>
      ) : (
        <div>Loading...</div>
      )}
    </Wrapper>
  );
}

MenuEditor.propTypes = {
  menuItems: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  editMode: PropTypes.bool.isRequired,
};
