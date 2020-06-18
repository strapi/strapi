/*
 *
 * HomePage
 *
 */

import React, { useState, useEffect, useReducer, useCallback } from 'react';
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
import pluginId from '../../pluginId';
import { get, upperFirst } from 'lodash';
import { remapSortlyInput, remapSortlyOutput } from '../../utils/RemapSortlyData';
import reducer, { initialState } from './reducer';

import Wrapper from './Wrapper';
import MenuEditor from '../../components/MenuEditor';
import { HomePageContextProvider } from '../../contexts/HomePage';
import { SelectMenuItemsData } from './selectors';

export default function HomePage({ location, history }) {
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const [editMode, setEditMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [originData, setOriginData] = useState(null);
  const [modifData, updateModifData] = useState(null);
  const [url, setUrl] = useState(`/${pluginId}/source-menu`);
  const { createItemForm } = reducerState.toJS();

  useEffect(() => {
    const getData = async () => {
      try {
        const { data } = await axios.get(url);
        const convertedData = convert(remapSortlyInput(data));
        setOriginData(convertedData);
        updateModifData(convertedData);
      } catch (err) {
        console.error(err);
      }
    };
    getData();
  }, []);

  const setEditModeOn = () => {
    setEditMode(true);
  };

  const setEditModeOff = () => {
    setEditMode(false);
    updateModifData(originData);
  };

  const saveMenuChanges = () => {
    const body = remapSortlyOutput(flatten(modifData));
    setEditMode(false);
    setOriginData(modifData);
    console.log('---body', body);
    axios({
      method: 'put',
      //tady musi byt url pluginu menueditor ve strapi
      url,
      data: body,
    });
  };

  const addNewItem = () => {
    const max = modifData.reduce((prev, current) => (prev.id > current.id ? prev : current));
    const newData = [...modifData];
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
    updateModifData(newData);
    dispatch({
      type: 'ON_SAVEITEM',
    });
    setShowModal(false);
  };

  const handleChangeMenu = useCallback(items => {
    updateModifData(items);
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

  const stateOptionsDropdown = [
    { value: 'Viditelná', name: 'basicItem' },
    { value: 'Skrytá', name: 'basicItem' },
    { value: 'Koncept', name: 'basicItem' },
  ];
  const typeOptionsDropdown = [
    { value: 'Běžná položka', name: 'basicItem' },
    { value: 'symlink', name: 'symLink' },
    { value: 'Label', name: 'label' },
    { value: 'Externí odkaz', name: 'hyperLink' },
    { value: 'Hardlink', name: 'hardLink' },
    { value: 'Systémová stránka', name: 'sysPage' },
  ];

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
                          options={stateOptionsDropdown.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.value}
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
                          options={typeOptionsDropdown.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.value}
                            </option>
                          ))}
                          value={get(createItemForm.labelType, 'value')}
                        />
                      )}
                    </FormattedMessage>
                  </div>
                  <div className="col-12" style={{ marginBottom: 0 }}>
                    {createItemForm.labelType.value !== 'Běžná položka' && (
                      <FormattedMessage id={`${pluginId}.MenuEditor.createForm.linkToPage`}>
                        {label => (
                          <Input
                            onChange={handleCreateForm}
                            name="labelLinkToPage"
                            type="text"
                            label={label}
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
          {modifData ? (
            <MenuEditor
              menuItems={modifData}
              editMode={editMode}
              showModal={openCreateDialog}
              updateModifData={handleChangeMenu}
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
