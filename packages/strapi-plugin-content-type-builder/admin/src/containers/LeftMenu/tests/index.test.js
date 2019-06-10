import React from 'react';
import formatMessagesWithPluginId from 'testUtils/formatMessages';
import pluginTradsEn from '../../../translations/en.json';
import { BrowserRouter } from 'react-router-dom';

import MenuContext from '../../MenuContext';
import LeftMenuLink from '../../../components/LeftMenuLink';
import LeftMenu, { getSectionTitle } from '../index';

import pluginId from '../../../pluginId';
import mountWithIntl from 'testUtils/mountWithIntl';

// @soupette
// TODO update the test when switching to react testing lib

const renderCompo = (context = { models: [] }) => (
  <MenuContext value={context}>
    <LeftMenu />
  </MenuContext>
);

const messages = formatMessagesWithPluginId(pluginId, pluginTradsEn);

const context = { emitEvent: jest.fn() };

const menucontext = {
  canOpenModal: true,
  models: [
    {
      icon: 'fa-cube',
      name: 'role',
      description: '',
      fields: 6,
      source: 'users-permissions',
      isTemporary: false,
    },
    {
      icon: 'fa-cube',
      name: 'product',
      description: 'super api',
      fields: 6,
      isTemporary: false,
    },
    {
      icon: 'fa-cube',
      name: 'test1',
      description: 'super api',
      fields: 6,
      isTemporary: true,
    },
  ],
  groups: [
    {
      uid: 'ingredients',
      name: 'Ingredients',
      source: null,
      schema: {
        connection: 'default',
        collectionName: 'ingredients',
        description: 'Little description',
        attributes: {
          name: {
            type: 'string',
            required: true,
          },
          quantity: {
            type: 'float',
            required: true,
          },
          picture: {
            model: 'file',
            via: 'related',
            plugin: 'upload',
          },
        },
      },
    },
    {
      uid: 'fruits',
      name: 'Fruits',
      source: null,
      schema: {
        connection: 'default',
        collectionName: 'ingredients',
        description: 'Little description',
        attributes: {
          name: {
            type: 'string',
            required: true,
          },
          quantity: {
            type: 'float',
            required: true,
          },
          picture: {
            model: 'file',
            via: 'related',
            plugin: 'upload',
          },
        },
      },
    },
  ],
  push: jest.fn(),
};

const renderComponent = () => {
  return mountWithIntl(
    <BrowserRouter>
      <MenuContext.Provider value={menucontext}>
        <LeftMenu />
      </MenuContext.Provider>
    </BrowserRouter>,
    messages,
    context
  );
};

describe('CTB <LeftMenu />', () => {
  it('Should not crash', () => {
    renderCompo(context);
  });

  describe('CTB <ModelPage /> render', () => {
    it('should render 5 links in the menu', () => {
      const wrapper = renderComponent();
      const links = wrapper.find(LeftMenuLink);

      expect(links).toHaveLength(5);
    });
  });

  it('should return a plural string for the user', () => {
    expect(getSectionTitle('model', [])).toContain('singular');
  });
});
