import React, { useCallback, useRef, memo } from 'react';
import { createDndContext, DndProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { ContextProvider } from 'react-sortly';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import nanoid from 'nanoid/non-secure';
import { FormattedMessage } from 'react-intl';
import SortableMenu from './SortableMenu';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

const newItemLabel = <FormattedMessage id="menu-editor.MenuEditor.addNewItem" />;

// function createNewItem(items) {
//   return {
//     id: nanoid(12),
//     name: {newItemLabel} + items.length,
//     isNew: true
//   };
// }

export default memo(function MenuEditor({ onChange, editMode, menuItems }) {
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
  const pages = 'plugins/content-manager/collectionType/application::page.page';

  // Page details
  const handleItemClick = useCallback(item => {
    history.push(`/${pages}/${item.id}?redirectUrl=${location}`);
  }, []);

  // Create new page
  const handleClickAddNew = useCallback(() => {
    history.push(`/${pages}/create?redirectUrl=${location}`);
  }, []);

  const manager = useRef(createDndContext(HTML5Backend));

  return (
    <Wrapper>
      <DndProvider manager={manager.current.dragDropManager} backend={HTML5Backend}>
        <ContextProvider>
          <SortableMenu
            // itemCreator={createNewItem}
            editMode={editMode}
            items={menuItems}
            onChange={handleChange}
            onItemClick={handleItemClick}
            onClickCreatePage={handleClickAddNew}
          />
        </ContextProvider>
      </DndProvider>
    </Wrapper>
  );
});
