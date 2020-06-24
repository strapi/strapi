import React, { useState, useEffect, useReducer } from 'react';
import { PluginHeader, request, Button } from 'strapi-helper-plugin';
import { flatten, convert } from 'react-sortly';
import init from 'strapi-plugin-content-manager/admin/src/containers/EditView/init';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FormattedMessage } from 'react-intl';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import styled from 'styled-components';
import Container from 'strapi-plugin-content-manager/admin/src/components/Container';
import { remapSortlyInput, remapSortlyOutput } from './utils/RemapSortlyData';
import pluginId from '../../pluginId';
import reducer, { initialState } from './reducer';
import NewMenuItemForm from '../../components/NewMenuItemForm';
import EditViewContext from '../../contexts/EditView';
import MenuEditor from '../../components/MenuEditor';

const getRequestUrl = path => `/${pluginId}/${path}`;

const EditView = () => {
  const [reducerState, dispatch] = useReducer(reducer, initialState, () => init(initialState));
  const [isModalVisible, setModalVisible] = useState(false);
  const {
    initialData,
    modifiedData,
    shouldRefetchData,
    shouldSaveData,
    editMode,
  } = reducerState.toJS();
  const abortController = new AbortController();
  const { signal } = abortController;

  // Fetch all data required for menu editor
  useEffect(() => {
    const fetchData = async () => {
      try {
        const pages = await request('/pages', {
          method: 'GET',
          signal,
        });
        const menuItems = await request(getRequestUrl('item'), {
          method: 'GET',
          signal,
        });
        const menuStates = await request(getRequestUrl('state'), {
          method: 'GET',
          signal,
        });
        const menuTypes = await request(getRequestUrl('type'), {
          method: 'GET',
          signal,
        });

        const transformed_menuItems = convert(remapSortlyInput(menuItems));

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data: {
            pages,
            menuItems: transformed_menuItems,
            menuStates,
            menuTypes,
          },
        });
      } catch (err) {
        strapi.notification.error(err.message);
      }
    };

    if (shouldRefetchData) {
      fetchData();
    }

    return () => {
      abortController.abort();
    };
  }, [shouldRefetchData, signal, abortController]);

  // Save modified menuItems to database
  useEffect(() => {
    const saveData = async () => {
      const transformed_menuItems = remapSortlyOutput(flatten(modifiedData.menuItems));
      try {
        await request(getRequestUrl('item'), {
          method: 'PUT',
          signal,
          body: transformed_menuItems,
        });

        dispatch({
          type: 'SAVE_ITEMS_SUCCEEDED',
        });
      } catch (err) {
        strapi.notification.error(err.message);
      }
    };

    if (shouldSaveData) {
      saveData();
    }

    return () => {
      abortController.abort();
    };
  }, [shouldSaveData, signal, abortController, modifiedData.menuItems]);

  const handleMove_menuItem = items => {
    dispatch({
      type: 'MOVE_ITEM',
      value: items,
    });
  };

  const handleAdd_menuItem = ({ title, type, state, page }) => {
    dispatch({
      type: 'ADD_ITEM',
      value: {
        // generate temp id to be replaced by database after save
        id: Math.random()
          .toString(20)
          .substr(2, 6),
        name: title,
        depth: 0,
        type,
        state,
        page,
        // Add property new item for post instead of put
        newItem: true,
      },
    });
  };

  // const handleRemove_menuItem = ({ target: { value } }) => {
  //   // Remove item from list by ID (value)
  //   dispatch({
  //     type: 'REMOVE_ITEM',
  //     value,
  //   });
  // };

  const pluginHeaderActions = [
    {
      kind: 'secondary',
      label: 'menu.MenuEditor.cancelEditMode',
      onClick: () => {
        dispatch({
          type: 'RESET_ITEMS',
        });
      },
      type: 'button',
    },
    {
      kind: 'primary',
      label: 'app.components.Button.save',
      onClick: () => {
        dispatch({
          type: 'SAVE_ITEMS',
        });
      },
      type: 'submit',
    },
  ];

  const actionEdit = [
    {
      kind: 'primary',
      label: 'menu.MenuEditor.editMode',
      onClick: () => {
        dispatch({
          type: 'SET_EDIT_MODE',
          value: true,
        });
      },
      type: 'button',
    },
  ];

  return (
    <EditViewContext.Provider
      value={{
        initialData,
        modifiedData,
        shouldRefetchData,
        editMode,
      }}
    >
      <Container className="container-fluid">
        <PluginHeader
          title={{ id: 'menu.MenuEditor.title' }}
          description={{ id: 'menu.MenuEditor.description' }}
          actions={editMode ? pluginHeaderActions : actionEdit}
        />
        <ActionsMenu {...{ editMode }}>
          <Button
            title={editMode ? 'Add new' : 'For edit structure, switch edit mode'}
            disabled={!editMode}
            kind={editMode ? 'primary' : 'secondary'}
            onClick={() => setModalVisible(true)}
          >
            <FontAwesomeIcon icon={faPlus} />
            <FormattedMessage id="menu.MenuEditor.addNewItem" />
          </Button>
        </ActionsMenu>
        <NewMenuItemForm
          {...{ isModalVisible, setModalVisible, modifiedData }}
          handleSubmit={handleAdd_menuItem}
        />
        <MenuEditor items={modifiedData.menuItems || []} handleMove={handleMove_menuItem} />
      </Container>
    </EditViewContext.Provider>
  );
};

export default EditView;

const ActionsMenu = styled.div`
  display: flex;
  > button {
    color: ${({ editMode }) => (editMode ? 'white' : 'gray')};
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
