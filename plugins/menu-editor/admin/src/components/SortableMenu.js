// FIXME: eslint-disable
/* eslint-disable */
import { Button } from 'strapi-helper-plugin';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fontawesome/react-fontawesome';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import React, { useCallback, useRef, useEffect } from 'react';
import SortableMenuItem from './SortableMenuItem';
import Sortly, { insert } from 'react-sortly';
import styled from 'styled-components';
import update from 'immutability-helper';

const ActionsMenu = styled.div`
  display: flex;
  > button {
    color: white;
    border-radius: 5px;
    height: 3.1em;
    font-size: 16px;
    line-height: 2.2em;
    display: flex;
    align-items: center;
    > svg {
      font-size: 2em;
    }
  }
`;

const SortlyWrapper = styled.div`
  display: flex;
  flex-flow: column wrap;
  flex: 0 1 700px;
  margin-top: 10px;
`;

export default function SortableMenu({
  itemCreator,
  items,
  onChange,
  onItemClick,
  onClickCreatePage,
  editMode,
}) {
  // Handle changing name in item's inputs
  const handleUpdateItem = useCallback(
    items => (id, value) => {
      const index = items.findIndex(item => item.id === id);
      onChange(
        update(items, {
          [index]: { name: { $set: value } },
        })
      );
    },
    [onChange]
  );

  // Click for show details about item (item.page_id can be used for route to any detail page)
  const handleClickOnItem = useCallback(
    items => id => {
      const item = items.find(item => item.id === id);
      onItemClick(item);
    },
    [onItemClick]
  );

  // CTRL+ENTER add new item under focused input and keep the same depth
  const handleKeyDown = useCallback(
    items => (id, e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        const index = items.findIndex(item => item.id === id);
        const item = itemCreator(items);
        onChange(insert(items, item, index));
      }
    },
    [itemCreator, onChange]
  );

  // Focus latest added input
  const ref = useRef(null);
  useEffect(() => {
    ref.current && ref.current.focus();
  }, [items.length]);

  return (
    <>
      <ActionsMenu editMode={editMode}>
        <Button kind="primary" onClick={onClickCreatePage}>
          <FontAwesomeIcon icon={faPlus} />
          <FormattedMessage id="menu-editor.MenuEditor.addNewItem" />
        </Button>
      </ActionsMenu>

      <SortlyWrapper>
        <Sortly items={items} onChange={onChange}>
          {item => (
            <SortableMenuItem
              id={item.data.id}
              value={item.data.name}
              depth={item.depth}
              isNew={item.data.isNew}
              editMode={editMode}
              onClick={handleClickOnItem(items)}
              onCreate={onClickCreatePage}
              onChange={handleUpdateItem(items)}
              onKeyDown={handleKeyDown(items)}
              myRef={ref}
            />
          )}
        </Sortly>
      </SortlyWrapper>
    </>
  );
}

SortableMenu.propTypes = {
  items: PropTypes.array.isRequired,
  itemCreator: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onClickCreatePage: PropTypes.func.isRequired,
  editMode: PropTypes.bool.isRequired,
};
