/*
 *
 * HomePage
 *
 */

import React, { useState, useEffect, useReducer, useCallback, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  PluginHeader,
  HeaderModal,
  HeaderModalTitle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalForm,
} from 'strapi-helper-plugin';
import axios from 'axios';
import { flatten, convert, add } from 'react-sortly';
import { FormattedMessage } from 'react-intl';
import { AttributeIcon, Button } from '@buffetjs/core';
import { Inputs as Input } from '@buffetjs/custom';
import { get } from 'lodash';
import useAxios from 'axios-hooks';
import pluginId from '../../pluginId';
import { remapSortlyInput, remapSortlyOutput } from '../../utils/RemapSortlyData';


import Wrapper from './Wrapper';
import MenuEditor from '../../components/MenuEditor';
import { HomePageContextProvider } from '../../contexts/HomePage';
import { SelectMenuItemsData } from './selectors';

const fullUrl = 'http://localhost:1337';

export default function HomePage({ location, history }) {
  const [reducerState, dispatch] = useReducer(MenuEditor_reducer, {});
  const [editMode, setEditMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [current_menuItems, update_current_menuItems] = useState(null);
  const [url] = useState(`${fullUrl}/${pluginId}/item`);
  const { createItemForm } = reducerState.toJS();

  const [pages, refetch_pages] = useAxios(`${fullUrl}/pages`);
  const [menuItems, refetch_menuItems] = useAxios(`${fullUrl}/menu/item`);
  const [menuStates, refetch_menuStates] = useAxios(`${fullUrl}/menu/state`);
  const [menuTypes, refetch_menuTypes] = useAxios(`${fullUrl}/menu/type`);

  const transformed_menuItems = useMemo(() => {
    const { data = null } = menuItems;

    if (data && Array.isArray(data)) {
      return convert(remapSortlyInput(data));
    }

    return [];
  }, [menuItems]);

  useEffect(() => {
    update_current_menuItems(transformed_menuItems);
  }, [transformed_menuItems]);

  const setEditModeOn = () => {
    setEditMode(true);
  };

  const setEditModeOff = () => {
    setEditMode(false);

    if (current_menuItems === transformed_menuItems) {
      update_current_menuItems(transformed_menuItems);
    } else if (window.confirm('Máte neuložené změny, opravdu zrušit?')) {
      update_current_menuItems(transformed_menuItems);
    }
  };

  const saveMenuChanges = () => {
    if (window.confirm('Uložit změny na server?')) {
      const body = remapSortlyOutput(flatten(current_menuItems));
      setEditMode(false);
      console.log('---body', body);
      axios({
        method: 'put',
        // tady musi byt url pluginu menueditor ve strapi
        url,
        data: body,
      });
    }
  };

  const addNewItem = () => {
    const max = current_menuItems.reduce((prev, current) => (prev.id > current.id ? prev : current));
    const newData = [...current_menuItems];
    let newItem = {
      id: max.id + 1,
      name: createItemForm.labelName.value,
      depth: 0,
      type: createItemForm.labelType.value,
    };

    if (createItemForm.labelType.value !== 'Běžná položka') {
      console.log('---NENI BEZNA POLOZKA');
      newItem.url = createItemForm.labelLinkToPage.value;
    }
    newData.push(newItem);

    console.log('---NEW DA', newData);
    update_current_menuItems(newData);
    dispatch({
      type: 'ON_SAVEITEM',
    });
    setShowModal(false);
  };

  const handleChangeMenu = useCallback(items => {
    update_current_menuItems(items);
  });

  const pluginHeaderActions = [
    {
      kind: 'secondary',
      label: 'menu.MenuEditor.cancelEditMode',
      onClick: setEditModeOff,
      type: 'button',
    },
    {
      kind: 'primary',
      label: 'app.components.Button.save',
      onClick: saveMenuChanges,
      type: 'submit',
    },
  ];

  const actionEdit = [
    {
      kind: 'primary',
      label: 'menu.MenuEditor.editMode',
      onClick: setEditModeOn,
      type: 'button',
    },
  ];

  const onClosedModal = () => {
    setShowModal(false);
  };

  const openCreateDialog = () => {
    setShowModal(true);
  };

  const handleCreateForm = ({ target: { name, value } }, e) => {
    dispatch({
      type: 'ON_CHANGE',
      name,
      value,
    });
  };

  return (
    <HomePageContextProvider pathname={location.pathname} push={history.push}>
      <form onSubmit={e => e.preventDefault()}>
        <Wrapper className="container-fluid">
          <PluginHeader
            title={{ id: 'menu.MenuEditor.title' }}
            description={{ id: 'menu.MenuEditor.description' }}
            actions={editMode ? pluginHeaderActions : actionEdit}
          />
          <Modal isOpen={showModal} onClosed={onClosedModal} style={{ width: 300 }}>
            <HeaderModal>
              <section>
                <HeaderModalTitle>
                  <div style={{ margin: 'auto 20px auto 0' }}>
                    <FormattedMessage id={`${pluginId}.MenuEditor.createForm.newItem`} />
                  </div>
                </HeaderModalTitle>
              </section>
            </HeaderModal>
            <form onSubmit={addNewItem}>
              <ModalForm>
                <ModalBody>
                  <div className="col-12" style={{ marginBottom: 0 }}>
                    <FormattedMessage id={`${pluginId}.MenuEditor.createForm.name`}>
                      {label => (
                        <Input
                          onChange={handleCreateForm}
                          name="labelName"
                          type="text"
                          label={label}
                          value={get(createItemForm.labelName, 'value', '')}
                        />
                      )}
                    </FormattedMessage>
                  </div>
                  <div className="col-12" style={{ marginBottom: 0 }}>
                    <FormattedMessage id={`${pluginId}.MenuEditor.createForm.state`}>
                      {label => (
                        <Input
                          onChange={handleCreateForm}
                          name="labelState"
                          type="select"
                          label={label}
                          options={menuStates.data && menuStates.data.map(option => (
                            <option key={option.code} value={option.code}>
                              {option.title}
                            </option>
                          ))}
                          value={get(createItemForm.labelState, 'value')}
                        />
                      )}
                    </FormattedMessage>
                  </div>
                  <div className="col-12" style={{ marginBottom: 0 }}>
                    <FormattedMessage id={`${pluginId}.MenuEditor.createForm.type`}>
                      {label => (
                        <Input
                          onChange={handleCreateForm}
                          name="labelType"
                          type="select"
                          label={label}
                          options={menuTypes.data && menuTypes.data.map(option => (
                            <option key={option.code} value={option.code}>
                              {option.title}
                            </option>
                          ))}
                          value={get(createItemForm.labelType, 'value')}
                        />
                      )}
                    </FormattedMessage>
                  </div>
                  <div className="col-12" style={{ marginBottom: 0 }}>
                    {createItemForm.labelType.value === 'contentType' && (
                      <FormattedMessage id={`${pluginId}.MenuEditor.createForm.linkToPage`}>
                        {label => (
                          <Input
                            onChange={handleCreateForm}
                            name="labelLinkToPage"
                            type="select"
                            label={label}
                            options={pages.data && pages.data.map(option => (
                              <option key={option.id} value={option.id}>
                                {option.title}
                              </option>
                            ))}
                            value={get(createItemForm.labelLinkToPage, 'value')}
                          />
                        )}
                      </FormattedMessage>
                    )}
                  </div>
                </ModalBody>
              </ModalForm>
              <ModalFooter>
                <section>
                  <Button onClick={onClosedModal} color="cancel">
                    <FormattedMessage id="components.popUpWarning.button.cancel" />
                  </Button>
                  <Button type="submit" color="success">
                    <FormattedMessage id="form.button.done" />
                  </Button>
                </section>
              </ModalFooter>
            </form>
          </Modal>
          {current_menuItems ? (
            <MenuEditor
              menuItems={current_menuItems}
              editMode={editMode}
              showModal={openCreateDialog}
              update_current_menuItems={handleChangeMenu}
            />
          ) : (
            'loading...'
          )}
        </Wrapper>
      </form>
    </HomePageContextProvider>
  );
}

HomePage.propTypes = {
  menuItems: PropTypes.array,
  history: PropTypes.any,
  location: PropTypes.any,
};
